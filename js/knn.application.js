var KNN = KNN || {};


KNN.Application = (function ($, _, window, model) {

    var knnWorker;

    var init = function () {
            //check browser-capabilities
            var can = window.document.createElement('canvas');

            if (!window.Worker || !! !(can.getContext && can.getContext('2d')) || !window.File || !window.FileReader) {
                window.alert("Your browser does not support canvas (n)or webworkers (n)or the File API, get a new one!");
                return;
            }

            KNN.Import = dataImportModule(jQuery, _.noConflict(), window, KNN.Model);

            KNN.Graphics = graphicsModule(jQuery, _.noConflict(), window, KNN.Model);
            KNN.Graphics.init(document.getElementById("charCanvas"), document.getElementById("diagramCanvas"));



            //UTIL FUNCTIONS
            Math.roundDec = function (n, dec) {
                return Math.round(n * Math.pow(10, 2)) / Math.pow(10, 2);
            };

            initFormDialog();

        }

    var initFormDialog = function () {

            //create dialog
            $("#dataSourceForm").dialog({
                "buttons": {
                    "OK": start
                },
                "width": 650
            });

            //disable button
            KNN.Import.enableApplicationStartButton(false);

            //form-events
            $("#dataSourceForm input[type=radio]").on("change", KNN.Import.radioButtonChangeHandler);
            $("#trainingDataInput, #testDataInput").on("change", KNN.Import.handleFileSelection);
            $("#trainingDataParseBtn, #testDataParseBtn").on("click", KNN.Import.handleFileParseCommand);
            $("#twoDimensionalDataValue, #trainingDataClassIndex, #testDataClassIndex").on("change", KNN.Import.handleSettingsChange);

        }

    var start = function () {

            KNN.Import.enableApplicationStartButton(false);

            //load examples if necessary
            if (model.mode !== "custom") {
                KNN.Import.loadExample(model.mode);
            }

            //one last time
            KNN.Import.updateClassInfos();
            KNN.Import = null;

            $(this).dialog("close");


            //visualize? check again, if not, remove container
            model.gui.dataHasXYPairs = $("#twoDimensionalDataValue").is(":checked");
            if (!model.gui.dataHasXYPairs) {
                $("#footer").empty().remove();
            }


            $("#mainWrapper").show();

            addEventListeners();

            for (var i = 0; i < model.classes.names.length; i++) {
                $("#legend table tbody").append("<tr style='background-color:" + model.classes.colors[i] + "'>" + "<td>" + i + "</td><td>" + model.classes.names[i] + "</td>" + "<td></td><td></td><td></td>" + "</tr>");
            }

        }



    var addEventListeners = function () {

            $("#progressbar").progressbar({
                value: 0,
                change: function () {
                    var num = $(this).progressbar("option", "value");
                    $("#progressbarLabel").text(Math.roundDec(num) + '%');
                }
            });

            $("#workerCtrlBtn").on("click", function (e) {

                if ($("#workerCtrlBtn").val() === "Start kNN-Analysis") {

                    if (parseInt($("#kAmountInput").val()) >= model.trainingData.data.length || parseInt($("#kAmountInput").val()) < 1) {
                        window.alert("k can't be bigger than trainingDataSets and must at least be 1.");
                        return;
                    }

                    if (parseInt($("#sigmaAmountInput").val()) < 0) {
                        window.alert("sigma can't be negative");
                        return;
                    }

                    startWorker();

                    $("#workerCtrlBtn").val("Stop kNN-Analysis");
                } else if (knnWorker) {
                    knnWorker.terminate();
                    onWorkerFinish();
                }

            });

            $("#resultTable tr").live("click", tableClickHandler);

        }

    var tableClickHandler = function (e) {

            if (model.gui.activeDataSet) $(model.gui.activeDataSet).toggleClass("active");

            model.gui.activeDataSet = $(this).toggleClass("active");

            //get the data back from the table cells
            var id = $(this).children()[0],
                dataStorageObj = JSON.parse($(this).attr("data-knndata")),
                increasedSigma = parseInt($($(this).children()[2]).text()) || 0;

            updateStats(model.classes.amount, dataStorageObj.classOccurencyTotal, dataStorageObj.classOccurencyWithinSigma, dataStorageObj.classWeight);


            if (model.gui.dataHasXYPairs) {
                KNN.Graphics.drawDataSets($(id).text(), dataStorageObj.neighbours);
            }

            KNN.Graphics.drawDiagram(dataStorageObj.neighbours, model.gui.previousSigma, increasedSigma);

        }


    var startWorker = function () {

            //cleanup
            $("#placeHolder").remove();
            $("#resultTable tbody").empty();
            model.stats.errorAmount = 0;
            $("statsContainer").text("0 error(s)");
            model.stats.startTime = new Date().getTime();
            $("#progressbar").css("visibility", "visible");

            model.gui.previousSigma = parseInt($("#sigmaAmountInput ").val());

            knnWorker = new Worker("js/knn.worker.js");

            knnWorker.addEventListener("message", onWorkerMessage);
            knnWorker.addEventListener('error', function (e) {
                console.log(e);
            }, false);

            knnWorker.postMessage({
                "trainingData": model.trainingData.data,
                "testData": model.testData.data,
                "k": parseInt($("#kAmountInput").val()),
                "sigma": model.gui.previousSigma,
                "kernelFuncName": $("#kernelFuncNameInput").val(),
                "distanceFuncName": $("#distanceFuncNameInput").val(),
                "sigmaAutoIncrease": $("#autoIncrementSigmaOption").is(":checked"),
                "classAmount": model.classes.amount,
                "classAttributePosition": model.trainingData.classIndex
            });

        }


    var onWorkerFinish = function () {
            $("#workerCtrlBtn").val("Start kNN-Analysis");
            $("#resultTable").tablesorter();

            $("#progressbar").css("visibility", "hidden");
            $("#statsContainer").text("exec. time: " + (new Date().getTime() - model.stats.startTime) / 1000 + "s, correct: " + model.stats.correctAmount + ", error(s): " + model.stats.errorAmount);
        }


    var onWorkerMessage = function (e) {

            //DEBUGGING
            //console.log(e.data);
            //return;

            //update progress
            $("#progressbar").progressbar({
                value: e.data.point / model.testData.data.length * 100
            });

            //everything that is important, but must not be displayed goes here
            var dataStorageObj = {};
            dataStorageObj.classOccurencyTotal = e.data.classOccurencyTotal;
            dataStorageObj.classOccurencyWithinSigma = e.data.classOccurencyWithinSigma;
            dataStorageObj.classWeight = e.data.classWeight;
            dataStorageObj.neighbours = e.data.neighbours;

            //add result-data to table
            $("#resultTable tbody").append("<tr " + "data-knndata='" + JSON.stringify(dataStorageObj) + "'>" 
				+ "<td class='id'>" + e.data.point + "</td>" 
				+ "<td class='left longfield'>" + ((model.testData.data[e.data.point].toString().length < 50) ? model.testData.data[e.data.point] : (model.testData.data[e.data.point].toString().substr(0, 50) + "...")) + "</td>" 
				+ "<td>" + ((e.data.sigmaIncreased !== null) ? e.data.sigmaIncreased : "") + "</td>" 
				+ "<td>" + ((e.data.predictedClass !== null) ? e.data.predictedClass : "None") + "</td>" 
				+ "<td>" + (model.testData.classIndex > 0 ? model.testData.data[e.data.point][model.testData.classIndex] : "") + "</td>" 
				+ "<td>" + (model.testData.classIndex > 0 ? (model.testData.data[e.data.point][model.testData.classIndex] == e.data.predictedClass).toString() : "") + "</td>" 
			+ "</tr>");

            //if the testData has no class-information, you can't compare it
            if (model.testData.classIndex > 0) {
                //highlight erros & increase counter
                if (model.testData.data[e.data.point][model.testData.classIndex] != e.data.predictedClass) {
                    model.stats.errorAmount++;
                    $("#statsContainer").text(model.stats.errorAmount + " error(s)");
                    $($("#resultTable tbody tr:last").children()[5]).addClass("error");
                } else {
                    model.stats.correctAmount++;
                }
            }

            //this would be the last one
            if (e.data.point === model.testData.data.length - 1) {
                onWorkerFinish();
            }


        }


    var updateStats = function (classAmount, occurenciesTotal, occurienciesWithinSigma, classWeights) {

            var ocTotal = 0,
                ocWS = 0;
            var i, current;

            $("#legend table tfoot").show();

            for (i = 0; i < classAmount; i++) {

                current = $($("#legend table tbody").children()[i]).children();

                ocTotal += occurenciesTotal[model.classes.names[i]] || 0;
                ocWS += occurienciesWithinSigma[model.classes.names[i]] || 0

                $($(current)[2]).text(occurenciesTotal[model.classes.names[i]] || 0);
                $($(current)[3]).text(occurienciesWithinSigma[model.classes.names[i]] || 0);
                $($(current)[4]).text(Math.roundDec(classWeights[model.classes.names[i]]) || 0);
            }

            $($("#legend table tfoot tr").children()[1]).text(ocTotal);
            $($("#legend table tfoot tr").children()[2]).text(ocWS);

        }


    return {
        init: init,
    }

}(jQuery, _.noConflict(), this, KNN.Model));