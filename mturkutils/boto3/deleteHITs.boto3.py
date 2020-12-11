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

"""Delete still active HITs from Mechanical Turk."""

__author__ = 'Florian Jaeger <fjaeger@ur.rochester.edu>'

import argparse
from datetime import datetime
import boto3

from botocore.exceptions import ClientError

from ruamel.yaml import load
try:
    from ruamel.yaml import CLoader as Loader
except ImportError:
    from ruamel.yaml import Loader


def manage_url(hitid: str, sandbox: bool = False) -> str:
    mturk_website = 'requestersandbox.mturk.com' if sandbox else 'requester.mturk.com'
    return 'https://{}/mturk/manageHIT?HITId={}'.format(
        mturk_website, hitid)


parser = argparse.ArgumentParser(description='Delete HITs that are not already active.')
parser.add_argument('-f', '--successfile', required=True, help='YAML file with HIT information')
parser.add_argument('-s', '--sandbox', action='store_true',
                    help='Run the command in the Mechanical Turk Sandbox (used for testing purposes)')
parser.add_argument('-p', '--profile',
                    help='Run commands using specific aws credentials rather the default. To set-up alternative credentials see http://boto3.readthedocs.org/en/latest/guide/configuration.html#shared-credentials-file')
args = parser.parse_args()

# Only region w/ MTurk endpoint currently is us-east-1
region = 'us-east-1'
endpoint = f'https://mturk-requester-sandbox.{region}.amazonaws.com' if args.sandbox else f'https://mturk-requester.{region}.amazonaws.com'

with open(args.successfile, 'r') as successfile:
    hitdata = load(successfile, Loader=Loader)
print('Loaded successfile')

# If you want to use profiles, you have to create a Session with one before connecting a client
session = boto3.Session(profile_name=args.profile)
mtc = session.client('mturk', endpoint_url=endpoint, region_name=region)

# Get hits specified in YAML success file
# hits = {h['HITId']: mtc.get_hit(HITId=h['HITId']).get('HIT') for h in hitdata}

# Delete HITs
# (based on https://stackoverflow.com/questions/54198700/how-to-delete-still-available-hits-using-boto3-client)
for item in hitdata:
    hit_id = item['HITId']
    print('HITId:', hit_id)

    # Get HIT status
    status = mtc.get_hit(HITId=hit_id)['HIT']['HITStatus']
    print('HITStatus:', status)

    # If HIT is active then set it to expire immediately
    if status == 'Assignable':
        response = mtc.update_expiration_for_hit(
            HITId=hit_id,
            ExpireAt=datetime(2015, 1, 1)
        )

    # Delete the HIT
    try:
        mtc.delete_hit(HITId=hit_id)
    except ClientError as e:
        print(f'Failed to delete: ${hit_id}')
        print(e)
    else:
        print(f'Deleted: ${hit_id}')
