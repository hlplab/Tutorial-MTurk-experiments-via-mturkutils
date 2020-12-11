#!/usr/bin/env python3

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

import argparse
from csv import DictReader

import boto3

from botocore.exceptions import ClientError

__author__ = 'Andrew Watts <awatts2@ur.rochester.edu>'

parser = argparse.ArgumentParser(description='Block a worker from doing your HITs on Amazon Mechanical Turk')
parser.add_argument('-blockfile', required=True, help="(required) File with comma separated 'worker' and 'reason' columns")
parser.add_argument('-p', '--profile',
                    help='Run commands using specific aws credentials rather the default. To set-up alternative credentials see http://boto3.readthedocs.org/en/latest/guide/configuration.html#shared-credentials-file')
args = parser.parse_args()

# Only region w/ MTurk endpoint currently is us-east-1
region = 'us-east-1'
endpoint = f'https://mturk-requester-sandbox.{region}.amazonaws.com' if args.sandbox else f'https://mturk-requester.{region}.amazonaws.com'
# If you want to use profiles, you have to create a Session with one before connecting a client
session = boto3.Session(profile_name=args.profile)

mtc = session.client('mturk', endpoint_url=endpoint, region_name=region)

with open(args.blockfile, 'r') as blockfile:
    for row in DictReader(blockfile):
        try:
            print(f'Blocking {row["workerid"]} for {row["reason"]}')
            mtc.create_worker_block(
                WorkerId=row['workerid'],
                Reason=row['reason']
            )
        except ClientError as e:
            print(e)
