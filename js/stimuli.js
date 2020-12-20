/*
 * Author: Dave F. Kleinschmidt
 *
 *    Copyright 2012 Dave Kleinschmidt and
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
 */

/*ExtendedStimuliFileList*/
/*Your baseobj can have whatever properties you want.
 * The only constraint is that it includes filenames (consisting of the audiofile you want to play
 */
function ExtendedStimuliFileList(baseobj) {
    $.extend(this, baseobj);
    this.listLength = this.filenames.length;
    this.check();

}

ExtendedStimuliFileList.prototype = {
    check: function() {
        if (typeof(this.filenames) === 'undefined') {
            throw('ExtendedStimuliFileList must contains a list of filenames');
        }
   }
};

