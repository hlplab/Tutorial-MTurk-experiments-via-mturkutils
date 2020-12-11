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

__author__ = 'Andrew Watts <awatts2@ur.rochester.edu>'

import argparse
from collections import Counter
from datetime import datetime

import boto3

from botocore.exceptions import ClientError

import pandas as pd

try:
    from ruamel_yaml import dump
except ImportError:
    from ruamel.yaml import dump

from xmltodict import parse as parse_xml


def extract_hit_url(row):
    """
    Extract the external question URL from XML encoded Question.

    If not an ExternalQuestion, fail and return original data
    """
    try:
        row_dict = parse_xml(row)
        if 'ExternalQuestion' in row_dict.keys():
            return row_dict['ExternalQuestion']['ExternalURL']
        elif 'HTMLQuestion' in row_dict.keys():
            return row_dict['HTMLQuestion']['HTMLContent']
        else:
            return row
    except KeyError:
        return row


parser = argparse.ArgumentParser(description='Get all current HITs for an account and dump to a CSV file.')
parser.add_argument('-s', '--sandbox', action='store_true',
                    help='Run the command in the Mechanical Turk Sandbox (used for testing purposes)')
parser.add_argument('-p', '--profile',
                    help='Run commands using specific aws credentials rather the default. To set-up alternative credentials see http://boto3.readthedocs.org/en/latest/guide/configuration.html#shared-credentials-file')
args = parser.parse_args()

# Only region w/ MTurk endpoint currently is us-east-1
region = 'us-east-1'
endpoint = f'https://mturk-requester-sandbox.{region}.amazonaws.com' if args.sandbox else f'https://mturk-requester.{region}.amazonaws.com'
# If you want to use profiles, you have to create a Session with one before connecting a client
session = boto3.Session(profile_name=args.profile)

mtc = session.client('mturk', endpoint_url=endpoint, region_name=region)

try:
    all_hits = []
    num_results = 10  # fake number of results so loop executes at least once
    next_token = None
    while num_results >= 10:  # 10 is the max you get at once
        hit_batch = mtc.list_hits(NextToken=next_token) if next_token else mtc.list_hits()
        num_results = hit_batch['NumResults']
        next_token = hit_batch['NextToken']
        all_hits.extend(hit_batch['HITs'])
except ClientError as e:
    print(e)

hit_keys = ('HITTypeId', 'HITGroupId', 'HITId', 'HITStatus', 'HITReviewStatus',
            'Title', 'Question', 'Description', 'Keywords', 'Reward',
            'CreationTime', 'AutoApprovalDelayInSeconds', 'AssignmentDurationInSeconds',
            'Expiration', 'NumberOfAssignmentsAvailable',
            'NumberOfAssignmentsCompleted', 'NumberOfAssignmentsPending',
            'MaxAssignments', 'QualificationRequirements')

hit_df = pd.DataFrame([{k: h[k] for k in h.keys() & set(hit_keys)} for h in all_hits])
hit_df['Question'] = hit_df['Question'].apply(extract_hit_url)
hit_df['QualificationRequirements'] = hit_df['QualificationRequirements'].apply(dump)

print(f'{len(all_hits)} current HITs')
for k, v in Counter([h['HITStatus'] for h in all_hits]).items():
    print(f'{k}: {v}')

outfile_name = 'all_hits-{}.csv'.format(datetime.now().isoformat())
print(f'Writing out "{outfile_name}"')
hit_df.to_csv(outfile_name, index=False, columns=hit_keys)
