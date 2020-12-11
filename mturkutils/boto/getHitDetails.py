#!/usr/bin/env python

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

"""
Get information about a HIT, including its completion status.
"""

from __future__ import print_function
import datetime
import calendar
from boto import config
from boto.mturk.connection import MTurkConnection
from csv import DictReader
import argparse
from os.path import expanduser

__author__ = 'Andrew Watts <awatts2@ur.rochester.edu>'

########################################################################
# A couple of functions borrowed from boto's "mturk" command line app

mturk_website = None

time_units = dict(
    s = 1,
    min = 60,
    h = 60 * 60,
    d = 24 * 60 * 60)

def preview_url(hit):
    return 'https://{}/mturk/preview?groupId={}'.format(
        mturk_website, hit.HITTypeId)

def display_duration(n):
    for unit, m in sorted(time_units.items(), key = lambda x: -x[1]):
        if n % m == 0:
            return '{} {}'.format(n / m, unit)

def parse_timestamp(s):
    '''Takes a timestamp like "2012-11-24T16:34:41Z".

Returns a datetime object in the local time zone.'''
    return datetime.datetime.fromtimestamp(
        calendar.timegm(
        datetime.datetime.strptime(s, '%Y-%m-%dT%H:%M:%SZ').timetuple()))

def display_datetime(dt):
    return dt.strftime('%e %b %Y, %l:%M %P')

# Adapted from boto's "mturk" command line app
def display_hit(hit, verbose = False):
    et = parse_timestamp(hit.Expiration)
    return '\n'.join([
        '{} ({}, {}, {})'.format(
            hit.Title,
            hit.FormattedPrice,
            display_duration(int(hit.AssignmentDurationInSeconds)),
            hit.HITStatus),
        'HIT ID: ' + hit.HITId,
        'Type ID: ' + hit.HITTypeId,
        'Group ID: ' + hit.HITGroupId,
        'Preview: ' + preview_url(hit),
        'Created {}   {}'.format(
            display_datetime(parse_timestamp(hit.CreationTime)),
            'Expired' if et <= datetime.datetime.now() else
                'Expires ' + display_datetime(et)),
        'Assignments: {} -- {} avail, {} pending, {} reviewable, {} reviewed'.format(
            hit.MaxAssignments,
            hit.NumberOfAssignmentsAvailable,
            hit.NumberOfAssignmentsPending,
            int(hit.MaxAssignments) - (int(hit.NumberOfAssignmentsAvailable) + int(hit.NumberOfAssignmentsPending) + int(hit.NumberOfAssignmentsCompleted)),
            hit.NumberOfAssignmentsCompleted)
            if hasattr(hit, 'NumberOfAssignmentsAvailable')
            else 'Assignments: {} total'.format(hit.MaxAssignments),
            # For some reason, SearchHITs includes the
            # NumberOfAssignmentsFoobar fields but GetHIT doesn't.
        ] + ([] if not verbose else [
            '\nDescription: ' + hit.Description,
            '\nKeywords: ' + hit.Keywords
        ])) + '\n'

########################################################################

parser = argparse.ArgumentParser(description='Get information about a HIT from Amazon Mechanical Turk')
parser.add_argument('-successfile', required=True, help='(required) The file to which you\'d like your results saved')
parser.add_argument('-sandbox', type=bool, default=False, help='Run the command in the Mechanical Turk Sandbox (used for testing purposes) NOT IMPLEMENTED')
parser.add_argument('-p', '--profile',
        help='Run commands using specific aws credentials rather the default. To set-up alternative credentials see http://boto3.readthedocs.org/en/latest/guide/configuration.html#shared-credentials-file')
args = parser.parse_args()

if args.sandbox:
    if not config.has_section('MTurk'):
        config.add_section('MTurk')
    config.set('MTurk', 'sandbox', 'True')

hitids = None
with open(expanduser(args.successfile), 'r') as successfile:
    hitids = [row['hitid'] for row in DictReader(successfile, delimiter='\t')]

mtc = MTurkConnection(is_secure=True, profile_name=args.profile)

# To get any information about status, you have to get the HIT via get_all_hits
# If you just use get_hit() it gets minimal info
all_hits = mtc.get_all_hits()

currhits = []
for h in all_hits:
    if h.HITId in hitids:
        currhits.append(h)
    # get_all_hits iterates through all your current HITs, grabbing 100 at a time
    # best to break as soon as you get all the HITIds in your group
    if len(currhits) == len(hitids):
        break


for c in currhits:
    print(display_hit(c, verbose=True))
    #print('HITId: {}'.format(c.HITId))
    # print('HITTypeId: {}'.format(c.HITTypeId))
    # print('Title: {}'.format(c.Title))
    # print('Description: {}'.format(c.Description))
    # print('keywords: {}'.format(c.Keywords))
    # print('Reward: {}'.format(c.FormattedPrice))
    # print('Max Assignments: {}'.format(c.MaxAssignments))
    # print('Available: {}'.format(c.NumberOfAssignmentsAvailable))
    # print('Pending: {}'.format(c.NumberOfAssignmentsPending))
    # print('Complete: {}'.format(c.NumberOfAssignmentsCompleted))
