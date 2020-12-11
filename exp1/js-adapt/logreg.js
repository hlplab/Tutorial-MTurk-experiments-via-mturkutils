/*
 * Author: Dave F. Kleinschmidt
 * Adapted from: John C. Pezzullo/Kevin M. Sullivan http://statpages.org/logistic.html
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

function Abs(x) { return Math.abs(x) }
function Sqrt(x) { return Math.sqrt(x) }
function Exp(x) { return Math.exp(x) }
function Ln(x) { return Math.log(x) }
function Power(x,n) { return Math.pow(x,n) }

var Pi = 3.141592653589793;
var PiD2 = Pi/2;

function ChiSq(x,n) {
    if(x>1000 | n>1000) { var q=Norm((Power(x/n,1/3)+2/(9*n)-1)/Sqrt(2/(9*n)))/2; if (x>n) {return q} else {return 1-q} }
    var p=Math.exp(-0.5*x); if((n%2)==1) { p=p*Math.sqrt(2*x/Pi) }
    var k=n; while(k>=2) { p=p*x/k; k=k-2 }
    var t=p; var a=n; while(t>1e-15*p) { a=a+2; t=t*x/a; p=p+t }
    return 1-p
    }

function Norm(z) {
    var q=z*z
    if(Abs(z)>7) {return (1-1/q+3/(q*q))*Exp(-q/2)/(Abs(z)*Sqrt(PiD2))} else {return ChiSq(q,1) }
}

function Fmt(x) {
    var v;
    if(x>=0) { v='          '+(x+0.00005) } else { v='          '+(x-0.00005) }
    v = v.substring(0,v.indexOf('.')+5)
    return v.substring(v.length-10,v.length)
}

function Fmt3(x) { 
    var v;
    v = "   " + x;
    return v.substring(v.length-3,v.length)
	         }

function Fmt9(x) { 
    var v;
    v = "         " + x;
    return v.substring(v.length-9,v.length)
	         }

function vFmt(x) { 
    var v;
    if(x>=0) { v='              '+(x+0.0000005) } else { v='          '+(x-0.0000005) }
    v = v.substring(0,v.indexOf('.')+7)
    return v.substring(v.length-14,v.length)
}

// replace instances of `from` with `to`
function Xlate(s,from,to) { 
    var v = s;
    var l=v.indexOf(from);
    while(l>-1) {
	v = v.substring(0,l) + to + v.substring(l+1,v.length);
	l=v.indexOf(from)
    }
    return v
}

function crArr(n) {
    this.length = n
    for (var i = 0; i < this.length; i++) { this[i] = 0 }
}

// 2-d index to 1-d index
function ix(j,k,nCols) { 
    return j * nCols + k 
}

var CR = unescape("%0D");
var LF = unescape("%0A");
var Tb = unescape("%09");
var NL = CR + LF;

// link function: logistic
function logistic(eta) {
    var mu;
    mu = Exp(-eta) / (1 + Exp(-eta));
    return(mu);
}

// inverse-link function: logit
function logit(mu) {
    var eta;
    eta = Ln(mu) / Ln(1-mu);
    return(eta);
}

/*
WHat do I need this to do?
Maintain state: number of positive/negative responses to each stimulus
Update state: given stim/resp pair
Calculate/maintain logistic regression fit
Compute x-intercept and slope
Compute predicted values for given stimulus predictor values


*/

// nC is number of observations, nR is number of predictors
function LogReg(nC, nR) {

    var i = 0; var j = 0; var k = 0; var l = 0;

    // number of data points/distinct predictor values
    this.nC   = nC;
    // number of predictor variables
    this.nR   = nR;
    var nP = nR+1;
    this.nP   = nP;
    var nP1 = nP+1;
    this.nP1  = nP1;
    // sums of negative, positive, and all cases
    this.sY0 = 0;
    this.sY1 = 0;
    this.sC = 0;

    // predictors (including intercept in column 0)
    this.X    = new crArr( nC * ( nR + 1 ) );
    // vectors of negative and positive counts for each row
    this.Y0   = new crArr( nC );
    this.Y1   = new crArr( nC );
    // predictor means/SDs (calculated occasionally from sum/sum of squares)
    this.xM   = new crArr( nR + 1 );
    this.xSD  = new crArr( nR + 1 );
    this.meanSDuptodate = false;
    this.predictorsZscored = false;
    // predictor SUMS OF SQUARES (updated incrementally)
    this.xSS  = new crArr( nR + 1 );

    // regression parameters (coefficients)
    this.Par  = new crArr( nP );
    // standard errors of the paramters (coefficients)
    this.SEP  = new crArr( nP );
    // (something for intermediate computation)
    this.Arr  = new crArr( nP * nP1 );

    // parse input data
    // replace with initialize with predictor values, then add observations one at a time?
    this.init = function(x0) {
        for (i=0; i<nC; i++) {
            // intercept term
	    this.X[ix(i,0,nR+1)] = 1;
            // predictors
	    for (j = 1; j<=nR; j++) {
	        //l = v.indexOf(","); if( l==-1 ) { l = v.length };
                // convert from character to numeric using eval()
	        //x = eval(v.substring(0,l))
                // read predictor values from input x0
                var x = x0[ix(i,j-1,nR)];
	        this.X[ix(i,j,nR+1)] = x;
                // remove parsed portion of string
	        //v = v.substring(l+1,v.length);
	    }
        }
    }

    // get empirical frequency for X[xi,]
    this.respFreq = function(xi) {
        // for negative indices, go back that far from end
        if (xi < 0) {
            xi = this.nC + xi;
        }
        return( this.Y1[xi] / (this.Y0[xi] + this.Y1[xi]));
    }

    // calculate the x-intercept (where predicted log-odds = 0)
    this.xint = function(j) {
        var xint;
        if (typeof(j)=='undefined') {
            if (this.nR==1) {
                xint = -this.Par[0] / this.Par[1];
            } else {
                xint = new crArr(this.nR);
                for (j=0; j<this.nR; j++) {
                    xint[j] = -this.Par[0] / this.Par[j+1];
                }
            }
        } else {
            xint = -this.Par[0] / this.Par[j+1];
        }
        return(xint);
    }

    // predict probability for predictor vector xx
    this.predict = function(xx) {
        if (typeof(xx) === 'number' && this.nR == 1) {
            // accept bare numbers only when number of predictors is 1
            xx = [xx];
        } else if (xx.length != this.nR) {
            // check length of predictor vector
            throw "length mismatch between predictors and coefficients";
        }
        if (this.predictorsZscored) {
            // make sure we're not in the middle of computation for some reason
            throw "Attempt to predict when predictors are Z-scored (computation in progress)";
        }
        var predLogOdds = this.Par[0];
        for (j = 1; j<=nR; j++) {
            predLogOdds += xx[j-1] * this.Par[j];
        }
        return(logistic(predLogOdds));
    };

    // add one observation, corresponding to the INDEX of predictor matrix row xi, with value y
    this.addObs = function(xi, y) {
        if (xi >= nC) {
            throw "bad x index";
        } else if (this.predictorsZscored) {
            throw "Attempt to add observation when predictors are Z-scored"
        }
        if (y==0) {
            this.Y0[xi] += 1;
            this.sY0 += 1;
        } else if (y==1) {
            this.Y1[xi] += 1;
            this.sY1 += 1;
        } else {
            throw "bad y value";
        }
        // update running count, mean, and variance
        this.sC += 1;
        // running mean (sum) and sum of squares for each predictor
	for (var j = 1; j<=nR; j++) {
	    x = this.X[ix(xi,j,nR+1)];
            var delta = x - this.xM[j];
            this.xM[j] += delta / this.sC;
	    this.xSS[j] += delta * (x - this.xM[j]);
	}
    }

    this.batchAddObs = function(y0, y1) {
        for (var i=0; i<y0.length; i++) {
            for (var j=0; j<y0[i]; j++) {
                this.addObs(i, 0);
            }
            for (var j=0; j<y1[i]; j++) {
                this.addObs(i, 1);
            }
        }
    }

    this.updateMeanSD = function() {
        for (j = 1; j<=nR; j++) {
	    this.xSD[j] = Sqrt( this.xSS[j] / this.sC );
	    //o = o + (  "   " + Fmt3(j) + "    " + Fmt(xM[j]) + Fmt(xSD[j])+ NL );
        }
        this.xM[0] = 0; this.xSD[0] = 1;
        this.meanSDuptodate = true;
    }

    this.zScorePredictors = function() {
        if (!this.meanSDuptodate) {
            this.updateMeanSD();
        }
        if (this.predictorsZscored) {return;}
        for (i = 0; i<nC; i++) {
	    for (j = 1; j<=nR; j++) {
	        this.X[ix(i,j,nR+1)] = ( this.X[ix(i,j,nR+1)] - this.xM[j] ) / this.xSD[j];
	    }
        }
        this.predictorsZscored = true;
    }

    this.unZscorePredictors = function() {
        if (!this.meanSDuptodate) {
            this.updateMeanSD();
        }
        if (!this.predictorsZscored) {return;}
        for (i = 0; i<nC; i++) {
	    for (j = 1; j<=nR; j++) {
                var SD = Sqrt(this.xSS[j] / this.sC);
	        this.X[ix(i,j,nR+1)] = this.X[ix(i,j,nR+1)] * this.xSD[j] + this.xM[j];
	    }
        }
        this.predictorsZscored = false;
    }

    // fit the logistic regression
    this.fit = function() {
        // don't do anything if there aren't at least 2 observations
        if (this.sC < 2) {return;}
        // initialize parameters (coefficients) for null model...
        // ...intercept term is empirical probability of positive outcome
        this.Par[0] = Ln( this.sY1 / this.sY0 );
        // ...predictor slopes are zero
        for (j = 1; j<=nR; j++) {
	    this.Par[j] = 0;
        }

        // Z-score predictors
        this.zScorePredictors();
        
        var LnV = 0; var Ln1mV = 0;

        // log-likelihood of last iteration and current iteration
        var LLp = 2e+10;
        var LL  = 1e+10;

        // optimization loop

        while( Abs(LLp-LL)>0.0000001 ) {
	    LLp = LL;
	    LL = 0;
	    for (j = 0; j<=nR; j++) {
	        for (k = j; k<=nR+1; k++) {
		    this.Arr[ix(j,k,nR+2)] = 0;
	        }
	    }
	    
	    for (i = 0; i<nC; i++) {	
	        var v = this.Par[0];
	        for (j = 1; j<=nR; j++) {
		    v = v + this.Par[j] * this.X[ix(i,j,nR+1)];
	        }
	        if( v>15 ) { LnV = -Exp(-v); Ln1mV = -v; q = Exp(-v); v=Exp(LnV) }
	        else { if( v<-15 ) {	LnV = v; Ln1mV = -Exp(v); q = Exp(v); v=Exp(LnV) }
		       else { v = 1 / ( 1 + Exp(-v) ); LnV = Ln(v); Ln1mV = Ln(1-v); q = v*(1-v) }
		     }
	        LL = LL - 2*this.Y1[i]*LnV - 2*this.Y0[i]*Ln1mV;
	        for (j = 0; j<=nR; j++) {
		    var xij = this.X[ix(i,j,nR+1)];
		    this.Arr[ix(j,nR+1,nR+2)] = this.Arr[ix(j,nR+1,nR+2)] + xij * ( this.Y1[i] * (1 - v) + this.Y0[i] * (-v) );
		    for (k=j; k<=nR; k++) {
		        this.Arr[ix(j,k,nR+2)] = this.Arr[ix(j,k,nR+2)] + xij * this.X[ix(i,k,nR+1)] * q * (this.Y0[i] + this.Y1[i]);
		    }
	        }
	    }

	    //o = o + ( NL + "-2 Log Likelihood = " + Fmt( LL ) );
            // record LL of null model (on the first iteration)
	    if( LLp==1e+10 ) {
                LLn = LL;
                //o = o + " (Null Model)"
            }
	    //form.output.value = o;

	    for (j = 1; j<=nR; j++) {
	        for (k=0; k<j; k++) {
		    this.Arr[ix(j,k,nR+2)] = this.Arr[ix(k,j,nR+2)];
	        }
	    }

	    for (i=0; i<=nR; i++) { 
                var s = this.Arr[ix(i,i,nR+2)]; this.Arr[ix(i,i,nR+2)] = 1;
	        for (k=0; k<=nR+1; k++) {
                    this.Arr[ix(i,k,nR+2)] = this.Arr[ix(i,k,nR+2)] / s;
                }
	        for (j=0; j<=nR; j++) {
		    if (i!=j) {
                        s = this.Arr[ix(j,i,nR+2)]; this.Arr[ix(j,i,nR+2)] = 0;
			for (k=0; k<=nR+1; k++) {
			    this.Arr[ix(j,k,nR+2)] = this.Arr[ix(j,k,nR+2)] - s * this.Arr[ix(i,k,nR+2)];
			}
		    }
	        }
	    }

	    for( j=0; j<=nR; j++) {
	        this.Par[j] = this.Par[j] + this.Arr[ix(j,nR+1,nR+2)];
	    }
        } // end optimization loop

        // calculate un-z-scored parameters, and standard errors
        for( j=1; j<=nR; j++) {
            this.Par[j] = this.Par[j] / this.xSD[j];
            this.SEP[j] = Sqrt( this.Arr[ix(j,j,nP+1)] ) / this.xSD[j];
            this.Par[0] = this.Par[0] - this.Par[j] * this.xM[j];
            //o = o + ( "   " + Fmt3(j) + "    " + Fmt(this.Par[j]) + Fmt(this.SEP[j]) + Fmt( Norm(Abs(this.Par[j]/this.SEP[j])) ) + NL );
        }

        // un-Z-score the predictors
        this.unZscorePredictors();
    }
}

function testLogReg() {
    var x0 = [6, 15, 20, 22, 23, 24, 25, 26, 27, 28, 30, 35, 44];
    var x = [10, 2, 4, 7, 3, 6, 9, 8, 1, 11, 5, 9, 10, 5, 4, 3, 6, 8, 7, 2, 4, 0,
             7, 11, 5, 1, 8, 6, 9, 2, 3, 12, 10, 7, 2, 4, 12, 6, 0, 8, 3, 11, 1,
             10, 9, 5, 10, 3, 4, 7, 11, 6, 5, 1, 9, 8, 2, 7, 10, 5, 9, 4, 6, 3,
             8, 2, 4, 11, 10, 5, 3, 1, 7, 9, 2, 8, 6, 0, 12, 4, 10, 7, 2, 3, 6,
             8, 5, 9, 2, 1, 0, 5, 9, 3, 7, 8, 10, 6, 12, 11, 4];
    var y = [1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1,
             0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1,
             0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0,
             1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0,
             0, 1, 1, 0, 0, 1, 0, 0, 1];

    lr = new LogReg(x0.length, 1);   
    lr.init(x0);
    
    for (i = 0; i < x.length; i++) {
        lr.addObs(x[i], y[i]);
    }
    
    lr.fit();
}

