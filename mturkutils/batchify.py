#!/usr/bin/env python

#Author: Dave Kleinschmidt
#
#    Copyright 2016 Dave Kleinschmidt and
#        the University of Rochester BCS Department
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Lesser General Public License version 2.1 as
#    published by the Free Software Foundation.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Lesser General Public License for more details.
#
#    You should have received a copy of the GNU Lesser General Public License
#    along with this program.
#    If not, see <http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html>.
#

from __future__ import print_function

import argparse
from ruamel.yaml import load, safe_dump, CLoader

parser = argparse.ArgumentParser(description='Convert a .yml config file with many assignments into a collection of smaller batches')
parser.add_argument('-c', '--config', required=True, help='YAML file with HIT configuration')
parser.add_argument('-n', '--batch-size', default=9, type=int, help='Size of assignment batches to output (default: 9)')

args = parser.parse_args()

with open(args.config, 'r') as configfile:
    configfilename = configfile.name
    configdata = load(configfile, Loader=CLoader)

assignments_to_go = configdata['assignments']

print("Breaking {} assignments from {} into batches of {} assignments".format(assignments_to_go, configfilename, args.batch_size))

batch_fn = configfilename.split('.')
batch_fn.insert(-1, '{}')
batch_fn = '.'.join(batch_fn)

print(batch_fn)

batch_i = 0
while assignments_to_go > 0:
    n = min(assignments_to_go, args.batch_size)
    configdata['assignments'] = n
    assignments_to_go -= n
    batch_i += 1
    with open(batch_fn.format(batch_i), 'w') as batchconfig:
        print("  Batch {}: {} ({} assignemnts)".format(batch_i, batchconfig.name, n))
        safe_dump(configdata, stream=batchconfig, default_flow_style=False)
