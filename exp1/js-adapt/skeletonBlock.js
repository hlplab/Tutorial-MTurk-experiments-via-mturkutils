/*
 * Author: Dave F. Kleinschmidt
 * http://davekleinschmidt.com
 *
 *    Copyright 2013 Dave Kleinschmidt and
 *        the University of Rochester BCS Department
 *
 *    This program is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU Lesser General Public License version 2.1 as
 *    published by the Free Software Foundation.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU Lesser General Public License for more details.
 *
 *    You should have received a copy of the GNU Lesser General Public License
 *    along with this program.
 *    If not, see <http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html>.
 *
 * 
 * Skeleton javascript for a new block type.  The demands of the experimentControl2.js
 * are only that 
 *   1) The block object have a run() method, which will be called to start the block
 *      and needs to show the instructions and initialize the block
 *   2) When done, the block hands control back to the Experiment by calling its own
 *      onEndedBlock() method, which will be provided by Experiment when the block 
 *      is added initially.
 */

function MyNewBlock(params) {
    if (typeof(params['text'] !== 'undefined')) {
        this.text = params['text'];        
    }
}

MyNewBlock.prototype = {
    text: 'Hello, world!',
    run: function() {
        $("#instructions").text(this.text);
        continueButton(function() {
                           this.onEndedBlock(); 
                       });
    }
};
