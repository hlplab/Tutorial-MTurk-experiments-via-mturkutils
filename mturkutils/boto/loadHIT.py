#!/usr/bin/env python
#
# Copyright (c) 2012-2017 Andrew Watts and the University of Rochester BCS Department
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

"""Load HITs to Mechanical Turk."""

from __future__ import print_function

import argparse
from datetime import timedelta

from boto.mturk.connection import MTurkConnection, MTurkRequestError
from boto.mturk.price import Price

from boto.mturk.qualification import (AdultRequirement,
                                      LocaleRequirement,
                                      NumberHitsApprovedRequirement,
                                      PercentAssignmentsAbandonedRequirement,
                                      PercentAssignmentsApprovedRequirement,
                                      PercentAssignmentsRejectedRequirement,
                                      PercentAssignmentsReturnedRequirement,
                                      PercentAssignmentsSubmittedRequirement,
                                      Qualifications,
                                      Requirement)
from boto.mturk.question import ExternalQuestion

from ruamel.yaml import load, safe_dump, CLoader

__author__ = 'Andrew Watts <awatts2@ur.rochester.edu>'

parser = argparse.ArgumentParser(description='Load a HIT into Amazon Mechanical Turk')
parser.add_argument('-c', '--config', required=True, help='YAML file with HIT configuration')
parser.add_argument('-s', '--sandbox', action='store_true',
                    help='Run the command in the Mechanical Turk Sandbox (used for testing purposes)')
parser.add_argument('-p', '--profile', help='Run commands using specific aws credentials rather the default.'
                                            'To set-up alternative credentials see '
                                            'http://boto3.readthedocs.org/en/latest/guide/configuration.html#shared-credentials-file')
args = parser.parse_args()

with open(args.config, 'r') as hitfile:
    hitfile_name = hitfile.name
    hitdata = load(hitfile, Loader=CLoader)

required_keys = ('description', 'title', 'assignments', 'keywords', 'reward', 'question')

abort = False
for k in required_keys:
    if k not in hitdata:
        print('{} is a required key in HIT file!'.format(k))
        abort = True
if abort:
    print('At least one required key missing; aborting HIT load')
    import sys
    sys.exit()

reward = Price(hitdata['reward'])
if 'input' in hitdata['question']:
    qurls = [hitdata['question']['url'].format(**row) for row in hitdata['question']['input']]
else:
    qurls = [hitdata['question']['url']]

questions = [ExternalQuestion(url, hitdata['question']['height']) for url in qurls]

quals = Qualifications()

if 'builtin' in hitdata['qualifications']:
    for b in hitdata['qualifications']['builtin']:
        if b['qualification'] == 'AdultRequirement':
            assert b['value'] in (0, 1), 'value must be 0 or 1, not {}'.format(b['value'])
            q = AdultRequirement(b['comparator'], b['value'], b['private'])
        elif b['qualification'] == 'LocaleRequirement':
            q = LocaleRequirement(b['comparator'], b['locale'], b['private'])
        else:
            q = {'NumberHitsApprovedRequirement': NumberHitsApprovedRequirement,
                 'PercentAssignmentsAbandonedRequirement': PercentAssignmentsAbandonedRequirement,
                 'PercentAssignmentsApprovedRequirement': PercentAssignmentsApprovedRequirement,
                 'PercentAssignmentsRejectedRequirement': PercentAssignmentsRejectedRequirement,
                 'PercentAssignmentsReturnedRequirement': PercentAssignmentsReturnedRequirement,
                 'PercentAssignmentsSubmittedRequirement': PercentAssignmentsSubmittedRequirement
                 }[b['qualification']](b['comparator'], b['value'], b['private'])
        quals.add(q)

if 'custom' in hitdata['qualifications']:
    for c in hitdata['qualifications']['custom']:
        optional = {}
        if 'value' in c:
            optional['integer_value'] = c['value']
        if 'private' in c:
            optional['required_to_preview'] = c['private']
        q = Requirement(c['qualification'], c['comparator'], **optional)
        quals.add(q)

host = 'mechanicalturk.sandbox.amazonaws.com' if args.sandbox else 'mechanicalturk.amazonaws.com'
mtc = MTurkConnection(is_secure=True, profile_name=args.profile, host=host)

# Time defaults in boto are WAY too long
duration = timedelta(minutes=60)
if 'assignmentduration' in hitdata:
    duration = timedelta(seconds=hitdata['assignmentduration'])
lifetime = timedelta(days=2)
if 'hitlifetime' in hitdata:
    lifetime = timedelta(seconds=hitdata['hitlifetime'])
approvaldelay = timedelta(days=14)
if 'autoapprovaldelay' in hitdata:
    approvaldelay = timedelta(seconds=hitdata['autoapprovaldelay'])

created_hits = []
for q in questions:
    try:
        hit = mtc.create_hit(question=q,
                             max_assignments=hitdata['assignments'],
                             title=hitdata['title'],
                             description=hitdata['description'],
                             keywords=hitdata['keywords'],
                             duration=duration,
                             lifetime=lifetime,
                             approval_delay=approvaldelay,
                             reward=reward,
                             qualifications=quals)
        created_hits.append(hit)
    except MTurkRequestError as e:
        print('{}: {}\n{}'.format(e.status, e.reason, e.body))

hit_list = [{'HITId': y.HITId, 'HITTypeId': y.HITTypeId} for y in [x[0] for x in created_hits]]

outfilename = hitfile_name.split('.')
outfilename.insert(-1, 'success')
outfilename = '.'.join(outfilename)
with open(outfilename, 'w') as successfile:
    safe_dump(hit_list, stream=successfile, default_flow_style=False)

preview_url = 'https://workersandbox.mturk.com/mturk/preview?groupId={}' if args.sandbox else 'https://www.mturk.com/mturk/preview?groupId={}'

for hittypeid in {x['HITTypeId'] for x in hit_list}:
    print('You can preview your new HIT at:\n\t{}'.format(preview_url.format(hittypeid)))
    print('{0} is the final balance'.format(mtc.get_account_balance()))
