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

import argparse

from typing import Dict, Tuple, Set

import boto3

from ruamel.yaml import load

try:
    from ruamel.yaml import CLoader as Loader
except ImportError:
    from ruamel.yaml import Loader

from unicodecsv import DictWriter

import xmltodict

__author__ = 'Andrew Watts <awatts2@ur.rochester.edu>'


def manage_url(hitid: str, sandbox: bool = False) -> str:
    mturk_website = 'requestersandbox.mturk.com' if sandbox else 'requester.mturk.com'
    return 'https://{}/mturk/manageHIT?HITId={}'.format(
        mturk_website, hitid)


def process_assignment(assignment: dict, hitinfo: dict, sandbox: bool = False) -> Tuple[Dict[str, str], Set]:
    """Turn an Assignment dict as returned by boto3 into a row for results file."""
    optional_assignment_keys = {
        'AcceptTime': 'assignmentaccepttime', 'RejectTime': 'assignmentrejecttime', 'Deadline': 'deadline',
        'RequesterFeedback': 'feedback', 'ApprovalTime': 'assignmentapprovaltime'
    }
    print(f'Processing AssignmentId: {assignment["AssignmentId"]} for Worker: {assignment["WorkerId"]}')
    row: Dict[str, str] = {
        'assignmentid': assignment['AssignmentId'],
        'assignmentstatus': assignment['AssignmentStatus'],
        'autoapprovaltime': assignment['AutoApprovalTime'],
        'hitid': assignment['HITId'],
        'viewhit': manage_url(assignment['HITId'], sandbox),
        'assignmentsubmittime': assignment['SubmitTime'],
        'workerid': assignment['WorkerId'],
        # these assignment keys are optional
        'assignmentaccepttime': '',
        'assignmentapprovaltime': '',
        'assignmentrejecttime': '',
        'deadline': '',
        'feedback': '',
        # 'reject' is for processing results files to mark which rows are to be rejected with an x
        'reject': '',
        # HIT keys.
        'hittypeid': hitinfo['HITTypeId'],
        'hitgroupid': hitinfo['HITGroupId'],
        'title': hitinfo['Title'],
        'description': hitinfo['Description'],
        'keywords': hitinfo['Keywords'],
        'reward': '$' + hitinfo['Reward'],
        'creationtime': hitinfo['CreationTime'],
        'assignments': hitinfo['MaxAssignments'],
        'numavailable': hitinfo['NumberOfAssignmentsAvailable'],
        'numpending': hitinfo['NumberOfAssignmentsPending'],
        'numcomplete': hitinfo['NumberOfAssignmentsCompleted'],
        'hitstatus': hitinfo['HITStatus'],
        'reviewstatus': hitinfo['HITReviewStatus'],
        'assignmentduration': hitinfo['AssignmentDurationInSeconds'],
        'autoapprovaldelay': hitinfo['AutoApprovalDelayInSeconds'],
        'hitlifetime': hitinfo['Expiration'],
        'annotation': ''
    }

    # populate the optional keys if they exist
    for k, v in optional_assignment_keys.items():
        if k in assignment:
            row[v] = assignment[k]

    assignment_keys = set()
    if 'QualificationRequirements' in hitinfo:
        for i, qual in enumerate(['|'.join(['{}:{}'.format(k, v) for k, v in x.items()]) for x in hitinfo['QualificationRequirements']]):
            qualkey = 'Qualification.{}'.format(i)
            row[qualkey] = qual
            assignment_keys.add(qualkey)

    if 'RequesterAnnotation' in hitinfo:
        row['annotation'] = hitinfo['RequesterAnnotation']

    # answers are in assignment['Answer'] as an MTurk QuestionFormAnswers XML string
    ordered_answers = xmltodict.parse(assignment.get('Answer')).get('QuestionFormAnswers').get('Answer')
    # FIXME: answer might not be FreeText, but that's what I'm handling for now
    # Other possibilities are:
    #    sequence of "SelectionIdentifier" and/or "OtherSelectionText"
    #    sequence of "UploadedFileSizeInBytes" and "UploadedFileKey"
    # http://docs.aws.amazon.com/AWSMechTurk/latest/AWSMturkAPI/ApiReference_QuestionFormAnswersDataStructureArticle.html
    # http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2005-10-01/QuestionFormAnswers.xsd

    # Sometimes you get a list or OrderedDicts, sometimes a single OrderedDict
    if issubclass(ordered_answers.__class__, dict):
        user_answers = {f"Answer.{ordered_answers['QuestionIdentifier']}": ordered_answers['FreeText']}
    else:
        user_answers = {f"Answer.{d['QuestionIdentifier']}": d['FreeText'] for d in ordered_answers}
    assignment_keys.update(set(user_answers.keys()))
    row.update(user_answers)
    return row, assignment_keys


parser = argparse.ArgumentParser(description='Get results from Amazon Mechanical Turk')
parser.add_argument('-f', '--successfile', required=True, help='YAML file with HIT information')
parser.add_argument('-r', '--resultsfile', required=True, help='Filename for tab delimited CSV file')
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

all_results = []
outkeys = ['hitid', 'hittypeid', 'hitgroupid', 'title', 'description', 'keywords', 'reward',
           'creationtime', 'assignments', 'numavailable', 'numpending', 'numcomplete',
           'hitstatus', 'reviewstatus', 'annotation', 'assignmentduration',
           'autoapprovaldelay', 'hitlifetime', 'viewhit', 'assignmentid', 'workerid',
           'assignmentstatus', 'autoapprovaltime', 'assignmentaccepttime',
           'assignmentsubmittime', 'assignmentapprovaltime', 'assignmentrejecttime',
           'deadline', 'feedback', 'reject']
answer_keys = set()

hits = {h['HITId']: mtc.get_hit(HITId=h['HITId']).get('HIT') for h in hitdata}

print('Processing results')
for h in hitdata:
    print(f'Processing HIT: {h["HITId"]}')
    response = mtc.list_assignments_for_hit(HITId=h['HITId'])
    assignments = response.get('Assignments')
    while response.get('NumResults', 0) >= 10:  # I assume 10 is the biggest number they show, but it'd be nice if it decreased
        response = mtc.list_assignments_for_hit(HITId=h['HITId'], NextToken=response.get('NextToken'))
        assignments.extend(response.get('Assignments'))
    for assignment in assignments:
        row, assignment_keys = process_assignment(assignment, hits[h['HITId']], args.sandbox)
        all_results.append(row)
        answer_keys.update(assignment_keys)

outkeys.extend(list(sorted(answer_keys)))

print(f'Writing {len(all_results)} results')
with open(args.resultsfile, 'wb') as outfile:
    dw = DictWriter(outfile, fieldnames=outkeys, delimiter='\t')
    dw.writeheader()

    for row in all_results:
        dw.writerow(row)
