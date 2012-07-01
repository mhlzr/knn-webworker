function graphicsModule($, _, window, model) {

    var init = function (dataCanvas, diagramCanvas) {
            this.dataSetCanvas = dataCanvas;
            this.dataSetCtx = dataCanvas.getContext("2d")

            this.diagCanvas = diagramCanvas;
            this.diagCtx = diagramCanvas.getContext("2d");
        }


    var drawDataSets = function (datasetId, neighbours) {

            var maxElements, i;

            maxElements = Math.min(250, neighbours.length);

            $(this.dataSetCanvas).attr("width", (maxElements + 1) * 100);

            this.dataSetCtx.clearRect(0, 0, (maxElements + 1) * 100, 140);

            drawDataSet(this.dataSetCtx, model.testData.data[datasetId], null, 0, 0);

            var current;
            for (i = 0; i < maxElements; i++) {
                drawDataSet(this.dataSetCtx, model.trainingData.data[neighbours[i][0]], neighbours[i][2], i * 100 + 100);
            }
        }

    var drawDataSet = function (ctx, dataSet, weight, xOffset) {

            //attributes above 100 need scaling
            var scaleFactor = 1,
                maxDistance = 100;

            var i, classIndex;

            ctx.font = "14pt Verdana";
            ctx.textAlign = "center";

            //testData
            if (weight !== null) {
                classIndex = model.testData.classIndex;
            }
            //training
            else {
                classIndex = model.trainingData.classIndex;
            }

            //find maxDistance, ignoring classInfo
            for (i = 0; i < dataSet.length; i++) {
                if (i === classIndex) continue;
                if (typeof dataSet[i] !== "number") continue;

                maxDistance = Math.max(maxDistance, dataSet[i]);
            }

            scaleFactor = Math.roundDec(100 / maxDistance);


            //testDataSet
            if (weight === null) {
                ctx.fillStyle = "#ffffff";
                if (model.testData.classIndex > 0) {
                    ctx.fillText("Test: " + model.classes.getIndexByClassName(dataSet[model.testData.classIndex]), xOffset + 50, 130);
                } else {
                    ctx.fillText("Test", xOffset + 50, 130);
                }

            }
            //trainingDataSet
            else {
                ctx.fillStyle = model.classes.getColorByClassName(dataSet[model.trainingData.classIndex]);
                ctx.fillRect(xOffset + 10 - 2, 130 - 17, 90, 20);

                ctx.fillStyle = "#000000";
                ctx.fillText(model.classes.getIndexByClassName(dataSet[model.trainingData.classIndex]) + ":" + Math.roundDec(weight), xOffset + 50, 130);


            }

            ctx.strokeStyle = "#ffffff";
            ctx.beginPath();

            //we always need a pair of X & Y and no class-Info, only numbers no strings
            dataSet = _.filter(dataSet, function (att) {
                return typeof att === "number"
            });

            var pairAmount = dataSet.length;
            if (dataSet.length % 2 === 1) pairAmount = dataSet.length - 1;

            //the "real"-drawing
            var x, y;
            for (i = 0; i < pairAmount; i += 2) {
                x = (scaleFactor * dataSet[i] + xOffset) | 0;
                y = (100 - scaleFactor * dataSet[i + 1]) | 0;
                ctx.lineTo(x, y);
            }

            ctx.stroke();

        }




    var drawDiagram = function (neighbours, sigma, increasedSigma) {


            var ctxWidth = ctxHeight = Math.min($(this.diagCanvas).attr("width"), $(this.diagCanvas).attr("height")),
                maxDistance = Math.max(sigma, increasedSigma);
            scaleFactor = 1, ctx = this.diagCtx;

            ctx.clearRect(0, 0, $(this.diagCanvas).attr("width"), ctxHeight);

            _.each(neighbours, function (n) {
                maxDistance = Math.max(maxDistance, n[1]);
            });

            scaleFactor = (ctxWidth - 20) / 2 / maxDistance;


            //TESTDATASET
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(ctxWidth / 2, ctxHeight / 2, 3, 0, Math.PI * 2, true);
            ctx.fill();


            //NEIGHBOURS
            var angle, color, cName;

            var circlePart = Math.PI * 2 / model.classes.amount;

            _.each(neighbours, function (n) {

                cName = model.trainingData.data[n[0]][model.trainingData.classIndex];
                angle = model.classes.getIndexByClassName(cName) * circlePart + Math.random() * circlePart + 1.5 * Math.PI;


                ctx.fillStyle = model.classes.getColorByClassName(cName);
                ctx.beginPath();

                ctx.arc(ctxWidth / 2 + Math.cos(angle) * n[1] * scaleFactor, ctxHeight / 2 + Math.sin(angle) * n[1] * scaleFactor, 3, 0, Math.PI * 2, true);

                ctx.fill();

            });


            ctx.fillStyle = "#FFFFFF";
            ctx.strokeStyle = "#FFFFFF";

            //SIGMA
            if ($("#kernelFuncNameInput").val() !== "none") {

                ctx.font = "9pt Verdana";
                ctx.textAlign = "right";

                ctx.beginPath();
                ctx.arc(ctxWidth / 2, ctxHeight / 2, sigma * scaleFactor, 0, Math.PI * 2, true);
                ctx.stroke();

                //SIGMA LABEL
                ctx.fillText("σ (sigma)", $("#diagramCanvas").attr("width"), ctxHeight - 17);


                //INCREASED SIGMA
                if (increasedSigma > 0) {
                    ctx.fillStyle = "#a98564";
                    ctx.strokeStyle = "#a98564";
                    ctx.beginPath();
                    ctx.arc(ctxWidth / 2, ctxHeight / 2, increasedSigma * scaleFactor, 0, Math.PI * 2, true);
                    ctx.stroke();

                    //INCREASED SIGMA LABEL
                    ctx.fillText("increased σ (sigma)", $("#diagramCanvas").attr("width"), ctxHeight - 2);
                }
            }

        }






    return {
        init: init,
        drawDataSets: drawDataSets,
        drawDiagram: drawDiagram

    }

}