var KNN = KNN || {};

KNN.Model = {
    "mode": "custom",

    "trainingData": {
        "file": null,
        "data": null,
        "classIndex": 0
    },
    "testData": {
        "file": null,
        "data": null,
        "classIndex": -1
    },
    "classes": {
        "amount": 0,
        "names": [],
        "colors": [],
        "getColorByClassName": function (name) {
            return KNN.Model.classes.colors[KNN.Model.classes.names.indexOf(name.toString())];
        },
        "getIndexByClassName": function (name) {
            return KNN.Model.classes.names.indexOf(name.toString());
        }
    },
    "gui": {
        "dataHasXYPairs": false,
        "activeDataSet": null,
        "previousDataSet": null,
        "previousSigma": null,
    },
    "stats": {
        "errorAmount": 0,
        "correctAmount": 0,
        "startTime": null
    }
};