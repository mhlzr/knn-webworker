importScripts('lib/underscore-min.js');


Kernel = {
    fn: {
        rect: function (d, sigma) {
            return (d <= sigma) ? 1 : 0;
        },
        triangle: function (d, sigma) {
            return Kernel.fn.rect(d, sigma) * (1 - d / sigma);
        },
        tricubic: function (d, sigma) {
            return Kernel.fn.rect(d, sigma) * Math.pow((1 - Math.pow(d, 3) / Math.pow(sigma, 3)), 3);
        },
        gauss: function (d, sigma) {
            return Math.exp(-((d * d) / (2 * sigma * sigma)));
        }
    }
};


Distance = {
    fn: {
        //Minkowski p=1
        manhattan: function (p1, p2) {
            return Math.abs(p1 - p2);
        },
        //Minkowski p=2
        euclid: function (p1, p2) {
            return Math.pow(p1 - p2, 2);
        }
    }
};

/**
 * k-Nearest-Neighbour implementation in a javascript webworker
 * Classifies objects based on closest training examples in the feature space
 * http://en.wikipedia.org/wiki/K-nearest_neighbor_algorithm
 *
 *@author Matthieu Holzer
 *@date 07/01/2012
 *
 *@requires underscore.js (http://underscorejs.org)
 *
 * @method knn
 * @param {Object} trainingData A Object including all the trainingDataSets
 * @param {Object} testData A Object including all the testDataSets
 * @param {number} k Number of neighbours to analyze
 * @param {number} sigma Range in which the neighbours have to be located
 * @param {String} kernelFuncName The name of the kernel-function which should be used
 * @param {String} distanceFuncName The name of the distance-function which should be used
 *
 * @param {Boolean} sigmaAutoIncrease Whether you wish to autoincrease sigma to include exactly k-neighbours (might slow everything down!)
 * @param {number} classAmount Amount of classes that exist in the trainingData
 * @param {number} classAttributePosition The index of your class-atrribute in the trainingData
 */
function knn(trainingData, testData, k, sigma, kernelFuncName, distanceFuncName, sigmaAutoIncrease, classAmount, classAttributePosition) {

    this.trainingData = trainingData;
    this.testData = testData;
    this.k = k;
    this.sigma = sigma;
    this.sigmaAutoIncrease = sigmaAutoIncrease || false;

    if (kernelFuncName === "none") {
        this.kernelFunction = null;
    } else {
        this.kernelFunction = Kernel.fn[kernelFuncName] || Kernel.fn.rect;
    }

    this.distanceFunction = Distance.fn[distanceFuncName] || Distance.fn.euclid;

    this.classAmount = classAmount; //amount of different classes in trainingData
    this.classAttributePosition = classAttributePosition || 0;
    this.sigmaIncreased = this.sigma;
    this.neighbours = null;
    this.co = null;

    //finds the nearest neighbours
    this.getNeighbours = function (index, sigmaToTest) {

        var j, k, weight, minAttributesLength;
        var distance = 0,
            neighbours = [];

        //loop trainingData
        for (j = 0; j < this.trainingData.length; j++) {

            //it's possible that both datasets have a different amount of attributes
            minAttributesLength = Math.min(this.trainingData[j].length, this.testData[i].length);

            //loop testData & trainingData attributes
            for (k = 0; k < minAttributesLength; k++) {
                //no need to check this if k = classAttribute or simply not a number
                if (k === this.classAttributePosition || isNaN(this.trainingData[j][k]) || isNaN(this.testData[index][k])) {
                    continue;
                }
                distance += this.distanceFunction(this.testData[index][k], this.trainingData[j][k]);
            }

            distance = Math.sqrt(distance);

            //[ [ id, distance, weight ] ]
            if (kernelFunction === null) {
                neighbours.push([j, distance, 1]);
            } else {
                weight = this.kernelFunction(distance, sigmaToTest);
                if (weight > 0) {
                    neighbours.push([j, distance, weight]);
                }
            }

            //cleanup
            weight = distance = 0;

        }

        return neighbours;


    }

    //counts how many neighbours have which class, restricted by sigma or not and it's weight
    this.getClassOccurencies = function () {
        var currentClassName;
        var classOccurencies = {
            total: {},
            weight: {},
            withinSigma: {}
        };

        _.each(neighbours, function (n) {

            currentClassName = this.trainingData[n[0]][this.classAttributePosition];

            //get class occurency total
            if (typeof classOccurencies.total[currentClassName] === "undefined") {
                classOccurencies.total[currentClassName] = 0;
            }
            classOccurencies.total[currentClassName] += 1;

            //if weight > 0
            if (n[2] > 0) {
                //get class weights
                if (typeof classOccurencies.weight[currentClassName] === "undefined") {
                    classOccurencies.weight[currentClassName] = 0;
                }
                classOccurencies.weight[currentClassName] += n[2];

                //get class occurency within original sigma
                if (n[1] <= this.sigma) {
                    if (typeof classOccurencies.withinSigma[currentClassName] === "undefined") {
                        classOccurencies.withinSigma[currentClassName] = 0;
                    }
                    classOccurencies.withinSigma[currentClassName] += 1;
                }
            }

        });

        return classOccurencies;

    }

    //predicts the class by highest weight
    this.getClassWithHighestWeight = function () {

        var maxClassName;

        for (var key in this.co.weight) {
            if (typeof maxClassName === "undefined" || this.co.weight[key] > this.co.weight[maxClassName]) {
                maxClassName = key;
            }
        }

        return (typeof maxClassName === "undefined") ? null : maxClassName;
    }


    //loop testData
    for (var i = 0; i < this.testData.length; i++) {

        //first time to look for neighbors
        this.neighbours = this.getNeighbours(i, this.sigmaIncreased);

        //increase sigma if activated
        if (this.sigmaAutoIncrease) {

            //as long as there are not enough neighbors in reach, increase reach (sigma)
            while (this.neighbours.length < this.k) {
                this.neighbours = this.getNeighbours(i, ++this.sigmaIncreased);
            }

        }

        //sort neighbours by distance-value
        this.neighbours = _.sortBy(this.neighbours, function (n) {
            return n[1];
        });

        //remove every neighbour, which position is > k
        this.neighbours = this.neighbours.slice(0, this.k);



        co = this.getClassOccurencies();


        postMessage({
            "point": i,
            "neighbours": this.neighbours,
            "predictedClass": this.getClassWithHighestWeight(),
            "sigmaIncreased": (this.sigmaIncreased !== this.sigma) ? this.sigmaIncreased : null,
            "classOccurencyTotal": co.total,
            "classOccurencyWithinSigma": co.withinSigma,
            "classWeight": co.weight
        });

        //resetting sigma
        this.sigmaIncreased = this.sigma;

    }


}

//this passes everything to the knn-function
onmessage = function (e) {
    knn(e.data.trainingData, e.data.testData, e.data.k, e.data.sigma, e.data.kernelFuncName, e.data.distanceFuncName, e.data.sigmaAutoIncrease, e.data.classAmount, e.data.classAttributePosition);
};