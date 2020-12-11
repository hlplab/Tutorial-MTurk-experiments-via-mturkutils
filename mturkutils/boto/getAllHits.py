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
#

from __future__ import print_function, division
import argparse
from datetime import datetime
from boto import config
from boto.mturk.connection import MTurkConnection
import pandas as pd

__author__ = 'Andrew Watts <awatts2@ur.rochester.edu>'

parser = argparse.ArgumentParser(description='Get all current HITs for an account and dump to a CSV file.')
parser.add_argument('-s', '--sandbox', action='store_true',
                    help='Run the command in the Mechanical Turk Sandbox (used for testing purposes)')
parser.add_argument('-p', '--profile',
        help='Run commands using specific aws credentials rather the default. To set-up alternative credentials see http://boto3.readthedocs.org/en/latest/guide/configuration.html#shared-credentials-file')
args = parser.parse_args()

if args.sandbox:
    if not config.has_section('MTurk'):
        config.add_section('MTurk')
    config.set('MTurk', 'sandbox', 'True')

mtc = MTurkConnection(is_secure=True, profile_name=args.profile)

all_hits = mtc.get_all_hits()

hit_keys = ('HITTypeId', 'HITGroupId', 'HITId', 'HITStatus', 'HITReviewStatus',
            'Title', 'Description', 'Keywords', 'Amount', 'Reward', 'FormattedPrice',
            'CurrencyCode', 'CreationTime', 'AutoApprovalDelayInSeconds',
            'AssignmentDurationInSeconds', 'Expiration', 'expired', 'NumberOfAssignmentsAvailable',
            'NumberOfAssignmentsCompleted', 'NumberOfAssignmentsPending',
            'MaxAssignments', 'QualificationTypeId', 'QualificationRequirement',
            'RequiredToPreview', 'Comparator', 'IntegerValue', 'Country', 'LocaleValue')

hit_info = [{key: h.__getattribute__(key) for key in hit_keys if hasattr(h, key)} for h in all_hits]
pd.DataFrame(hit_info).to_csv('all_hits-{}.csv'.format(datetime.now().isoformat()), index=False, columns=hit_keys)
