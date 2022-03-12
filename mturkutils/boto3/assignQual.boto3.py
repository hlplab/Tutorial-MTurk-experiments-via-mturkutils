#!/usr/bin/env python3
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

__author__ = 'Andrew Watts <awatts2@ur.rochester.edu>'

import argparse

from csv import DictReader

import boto3

from botocore.exceptions import ClientError

parser = argparse.ArgumentParser(description='Assign a qualification to Amazon Mechanical Turk workers')
parser.add_argument('-q', '--qualification', required=True, help='Qualification ID')
parser.add_argument('-r', '--resultsfile', required=True, help='Filename of tab delimited CSV file with results')
parser.add_argument('-s', '--sandbox', action='store_true',
                    help='Run the command in the Mechanical Turk Sandbox (used for testing purposes)')
parser.add_argument('-p', '--profile',
                    help='Run commands using specific aws credentials rather than the default. To set-up alternative credentials see http://boto3.readthedocs.org/en/latest/guide/configuration.html#shared-credentials-file')
args = parser.parse_args()

# Only region w/ MTurk endpoint currently is us-east-1
region = 'us-east-1'
endpoint = f'https://mturk-requester-sandbox.{region}.amazonaws.com' if args.sandbox else f'https://mturk-requester.{region}.amazonaws.com'
# If you want to use profiles, you have to create a Session with one before connecting a client
session = boto3.Session(profile_name=args.profile)

with open(args.resultsfile, 'r') as infile:
    results = list(DictReader(infile, delimiter='\t'))

mtc = session.client('mturk', endpoint_url=endpoint, region_name=region)

for row in results:
    try:
        mtc.associate_qualification_with_worker(
            QualificationTypeId=args.qualification,
            WorkerId=row['workerid'],
            IntegerValue=1,
            SendNotification=False
        )
        print("Assigning {} to {}".format(args.qualification, row['workerid']))
    except ClientError as e:
        print(e)
        print("Skipping {} for {}".format(args.qualification, row['workerid']))
