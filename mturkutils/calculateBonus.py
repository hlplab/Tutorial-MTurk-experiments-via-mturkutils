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
This script calculates what the bonus payments would be for an Amazon
Mechanical Turk experiment. To make it more flexible, it reads some
variables in from the file 'bonus.cfg'
n.b. This probably won't work in Python < 2.7

Fixed version of calculate_bonus
"""

from __future__ import print_function, division

from itertools import tee

import unicodecsv as csv
from six.moves import configparser, zip

__author__ = 'Andrew Watts <awatts2@ur.rochester.edu>'


def pairwise(iterable):
    """s -> (s0,s1), (s1,s2), (s2, s3), ..."""
    a, b = tee(iterable)
    next(b, None)
    return zip(a, b)

cfg = configparser.ConfigParser()
cfg.read('bonus.cfg')

resultfile = cfg.get('Files', 'result_file')
expt_name = cfg.get('Experiment', 'name')

trialamt = cfg.getfloat('Trial', 'trialamt')
# amazon takes 10% on top per HIT, minimum of $0.005
amzcut = trialamt * 0.10
if amzcut < 0.005:
    amzcut = 0.005

i = 1
bonus_steps = []
while cfg.has_option('Bonus', "trials%d" % i):
    bonus_steps.append(dict((
        ('count', cfg.getint('Bonus', "trials%d" % i)),
        ('amount', cfg.getfloat('Bonus', "bonus%d" % i))
        )))
    i += 1
bonus_steps = sorted(bonus_steps, key=lambda k: k['count'])

with open(resultfile, 'r') as csvfile:
    results = list(csv.DictReader(csvfile, delimiter='\t', encoding='utf-8'))

results_list = [(row['workerid'], row['assignmentid']) for row in results]
workers = set([row['workerid'] for row in results])

workers_by_count = []
for w in workers:
    matching_rows = [x for x in results_list if x[0] == w]
    workers_by_count.append(dict((('workerid', w), ('count', len(matching_rows)), ('assignmentid', matching_rows[0][1]))))
workers_by_count = sorted(workers_by_count, key=lambda k: k['count'])

step_indices = [s['count'] for s in bonus_steps]
step_indices.append(float("inf"))  # to catch from largest index up
bonus_workers = [w for w in workers_by_count if w['count'] >= step_indices[0]]
bonus_blocks = []
for x, y in pairwise(step_indices):
    bonus_blocks.append([w for w in bonus_workers if x <= w['count'] < y])

bonuscost = 0.0
for i, step in enumerate(bonus_steps):
    bonuscost += len(bonus_blocks[i]) * step['amount']

trialcost = (len(results) * trialamt)
amzcost = (len(results) * amzcut)
amzbonus = bonuscost * 0.10
percentworkers = (len(bonus_workers) / len(workers)) * 100
print("{0} workers did a total of {1} trials".format(len(workers), len(results)))
print("{0} workers ({1:.2f}%) earned bonuses".format(len(bonus_workers), percentworkers))
print("${0:.2f} total trial cost".format(trialcost))
print("${0:.2f} total amazon cut".format(amzcost))
print("${0:.2f} total bonus cost".format(bonuscost))
print("${0:.2f} total amazon bonus cut".format(amzbonus))
print("${0:.2f} total cost".format(trialcost + bonuscost + amzcost + amzbonus))


with open('bonus.' + expt_name + '.csv', 'w') as csvoutfile:
    fields = ('worker', 'trials', 'bonus', 'assignment')
    bonuswriter = csv.DictWriter(csvoutfile, fieldnames=fields, encoding='utf-8')
    bonuswriter.writeheader()
    for i, step in enumerate(bonus_steps):
        for row in [j for j in bonus_blocks[i]]:
            bonuswriter.writerow({
                'worker': row['workerid'],
                'trials': row['count'],
                'bonus': step['amount'],
                'assignment': row['assignmentid']
            })
