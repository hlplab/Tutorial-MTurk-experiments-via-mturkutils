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

from __future__ import print_function
import argparse
import pandas as pd
from boto.mturk.connection import MTurkConnection
from boto import config

__author__ = 'Andrew Watts <awatts2@ur.rochester.edu>'

parser = argparse.ArgumentParser(description='Approve work from Amazon Mechanical Turk')
parser.add_argument('-r', '--resultsfile', required=True, help='Filename for tab delimited CSV file')
parser.add_argument('-s', '--sandbox', action='store_true',
                    help='Run the command in the Mechanical Turk Sandbox (used for testing purposes)')
parser.add_argument('-p', '--profile',
        help='Run commands using specific aws credentials rather the default. To set-up alternative credentials see http://boto3.readthedocs.org/en/latest/guide/configuration.html#shared-credentials-file')
args = parser.parse_args()

if args.sandbox:
    if not config.has_section('MTurk'):
        config.add_section('MTurk')
    config.set('MTurk', 'sandbox', 'True')
    mturk_website = 'requestersandbox.mturk.com'

results = pd.read_csv(args.resultsfile, sep='\t')

needapproval = results[results['assignmentstatus'] == 'Submitted']

mtc = MTurkConnection(is_secure=True, profile_name=args.profile)

# TODO: to copy behavior of Java tools, reject any that have an 'x' in the
# 'reject' column and send feedback based on value of 'feedback' column
for a in list(needapproval['assignmentid']):
    print("Approving {}".format(a))
    mtc.approve_assignment(a)
