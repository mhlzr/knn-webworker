 var knnWorker;
 
 
                     function initApplication() {
										
						enableApplicationStartButton(false);

						//load examples if necessary
						if(Config.mode !== "custom"){
							loadExample(Config.mode);
						}
						
						//one last time
						updateClassInfos();
						
						$(this).dialog("close");
						
						if(!Config.gui.dataHasXYPairs){
							$("#footer").empty().remove();
						}
						else{
							        Config.gui.charCanvas = document.getElementById("charCanvas");
                        Config.gui.charCtx = Config.gui.charCanvas .getContext("2d");


						}
						
						                       Config.gui.diagramCanvas = document.getElementById("diagramCanvas");
                       Config.gui.diagramCtx = Config.gui.diagramCanvas.getContext("2d");
						
                        $("#mainWrapper").show();
						
						addEventListeners();
						
                        console.log(Config);

                        for (var i = 0; i < Config.classes.names.length; i++) {
                            $("#legend table tbody").append("<tr style='background-color:" + Config.classes.colors[i] + "'>" + "<td>" + i + "</td><td>" + Config.classes.names[i] + "</td>" + "<td></td><td></td><td></td>" + "</tr>");
                        }

                    }
					
 
 function addEventListeners() {
	
	    $("#progressbar").progressbar({
        value: 0,
        change: function () {
            var num = $(this).progressbar("option", "value");
            $("#progressbarLabel").text(Math.roundDec(num) + '%');
        }
    });

    $("#workerCtrlBtn").on("click", function (e) {
        if ($("#workerCtrlBtn").val() === "Start kNN-Analysis") {
			
            if (parseInt($("#kAmountInput").val()) >= Config.trainingData.data.length || parseInt($("#kAmountInput").val()) < 1) {
                window.alert("k can't be bigger than trainingDataSets and must at least be 1.");
                return;
            }
			
			if (parseInt($("#sigmaAmountInput").val()) < 0 ) {
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

    $("#resultTable tr").live("click", onTableClick);

}



function onTableClick(e) {

    if (Config.gui.activeDataSet) $(Config.gui.activeDataSet).toggleClass("active");

    Config.gui.activeDataSet = $(this).toggleClass("active");

    //get the data back from the table cells
    var id = $(this).children()[0],
		dataStorageObj = JSON.parse( $(this).attr("data-knndata") ),
        increasedSigma = parseInt($($(this).children()[2]).text()) || 0;

    updateStats(Config.classes.amount, dataStorageObj.classOccurencyTotal, dataStorageObj.classOccurencyWithinSigma, dataStorageObj.classWeight);

    if(Config.gui.dataHasXYPairs)
		drawCharacterData($(id).text(), dataStorageObj.neighbours);
		
    drawDiagram($(id).text(), dataStorageObj.neighbours, Config.gui.previousSigma , increasedSigma);
}


function startWorker() {

    //cleanup
	$("#placeHolder").remove();
    $("#resultTable tbody").empty();
    Config.stats.errorAmount = 0;
    $("statsContainer").text("0 error(s)");
    Config.stats.startTime = new Date().getTime();
    $("#progressbar").css("visibility", "visible");

    Config.gui.previousSigma = parseInt($("#sigmaAmountInput ").val());

    knnWorker = new Worker("js/knn.worker.js");

    knnWorker.addEventListener("message", onWorkerMessage);
    knnWorker.addEventListener('error', function (e) {
        console.log(e);
    }, false);

    knnWorker.postMessage({
        "trainingData": Config.trainingData.data,
        "testData": Config.testData.data,
        "k": parseInt($("#kAmountInput").val()),
        "sigma": Config.gui.previousSigma,
        "kernelFuncName": $("#kernelFuncNameInput").val(),
        "sigmaAutoIncrease": $("#autoIncrementSigmaOption").is(":checked"),
		"classAmount" : Config.classes.amount,
		"classAttributePosition" : Config.trainingData.classIndex
    });
}



function onWorkerFinish() {
    $("#workerCtrlBtn").val("Start kNN-Analysis");
    $("#resultTable").tablesorter();

    $("#progressbar").css("visibility", "hidden");
    $("#statsContainer").text("exec. time: " + (new Date().getTime() - Config.stats.startTime) / 1000 + "s, correct: " + Config.stats.correctAmount+ ", error(s): " + Config.stats.errorAmount);
}


function onWorkerMessage(e) {

    //DEBUGGING
	//console.log(e.data);
	//return;

    //update progress
    $("#progressbar").progressbar({
        value: e.data.point / Config.testData.data.length * 100
    });

	//everything that is important, but must not be displayed goes here
	var dataStorageObj = {};
		dataStorageObj.classOccurencyTotal = e.data.classOccurencyTotal;
		dataStorageObj.classOccurencyWithinSigma = e.data.classOccurencyWithinSigma;
		dataStorageObj.classWeight = e.data.classWeight;
		dataStorageObj.neighbours = e.data.neighbours;
		
    //add result-data to table
    $("#resultTable tbody").append("<tr "
		+ "data-knndata='" +  JSON.stringify( dataStorageObj ) + "'>"
		+ "<td class='id'>" + e.data.point + "</td>" 
		+ "<td class='left longfield'>" + Config.testData.data[e.data.point] + "</td>" 
		+ "<td>" + ((e.data.sigmaIncreased !== null) ? e.data.sigmaIncreased : "") + "</td>" 
		+ "<td>" + e.data.predictedClass + "</td>"
		+ "<td>" + (Config.testData.classIndex > 0 ? Config.testData.data[e.data.point][Config.testData.classIndex] : "") + "</td>" 
		+ "<td>" + (Config.testData.classIndex > 0 ? (Config.testData.data[e.data.point][Config.testData.classIndex] == e.data.predictedClass).toString() : "") + "</td>" 
	+ "</tr>");

	//if the testData has no class-information, you can't compare it
	if(Config.testData.classIndex > 0){
		//highlight erros & increase counter
		if (Config.testData.data[e.data.point][Config.testData.classIndex] != e.data.predictedClass) {
			Config.stats.errorAmount++;
			$("#statsContainer").text(Config.stats.errorAmount + " error(s)");
			$($("#resultTable tbody tr:last").children()[5]).addClass("error");
		}
		else{
			Config.stats.correctAmount++;
		}
	}

	//this would be the last one
    if (e.data.point === Config.testData.data.length - 1) {
        onWorkerFinish();
    }


}


function drawCharacterData(datasetId, neighbours) {
    var maxChars, i;

    maxChars = Math.min(250, neighbours.length);

    $(Config.gui.charCanvas).attr("width", (maxChars + 1) * 100);

    Config.gui.charCtx.clearRect(0, 0, (maxChars + 1) * 100, 140);
    drawChar(Config.testData.data[datasetId], null, 0, 0);

    for (i = 0; i < maxChars; i++) {
        drawChar(Config.trainingData.data[neighbours[i][0]], neighbours[i][2], i * 100 + 100);
    }


}


function drawChar(dataSet, weight, xOffset) {

    Config.gui.charCtx.font = "14pt Verdana";
    Config.gui.charCtx.textAlign = "center";
	
	var scaleFactor = 1,
		maxDistance = 100;
	
	
    _.each(dataSet, function (n) {
        maxDistance = Math.max(maxDistance, n);
    });
	
	scaleFactor = 100 / maxDistance;
	
    //testDataSet
    if (weight == null ) {
       Config.gui.charCtx.fillStyle = "#ffffff";
	   if(Config.testData.classIndex > 0){
		Config.gui.charCtx.fillText("Test: " + Config.classes.getIndexByClassName( dataSet[Config.testData.classIndex] ), xOffset + 50, 130);
	   }
	   else{
			Config.gui.charCtx.fillText("Test", xOffset + 50, 130);
	   }

    }
    //trainingDataSet
    else {
        Config.gui.charCtx.fillStyle = Config.classes.getColorByClassName( dataSet[Config.trainingData.classIndex] );
        Config.gui.charCtx.fillRect(xOffset + 10 - 2, 130 - 17, 90, 20);

        Config.gui.charCtx.fillStyle = "#000000";
        Config.gui.charCtx.fillText( Config.classes.getIndexByClassName( dataSet[Config.trainingData.classIndex]) + ":" + Math.roundDec(weight), xOffset + 50, 130);
    }



    Config.gui.charCtx.strokeStyle = "#ffffff";
    Config.gui.charCtx.beginPath();


    for (var i = 0; i < dataSet.length; i += 2) {
        Config.gui.charCtx.lineTo( scaleFactor * (dataSet[i] + xOffset), scaleFactor*(100 - dataSet[i+1]) );
    }

   Config.gui.charCtx.stroke();

}


function updateStats(classAmount, occurenciesTotal, occurienciesWithinSigma, classWeights) {

    var i, current;

    for (i = 0; i < classAmount; i++) {

        current = $($("#legend table tbody").children()[i]).children();

        $($(current)[2]).text( occurenciesTotal [Config.classes.names[i] ] || 0 );
        $($(current)[3]).text( occurienciesWithinSigma [Config.classes.names[i] ] || 0);
		$($(current)[4]).text( Math.roundDec(classWeights [Config.classes.names[i] ]) || 0);
    }

}


function drawDiagram(dataSetId, neighbours, sigma, increasedSigma) {
	
    var ctxWidth = ctxHeight = Math.min($("#diagramCanvas").attr("width"), $("#diagramCanvas").attr("height")),
        maxDistance = Math.max(sigma, increasedSigma);
		scaleFactor = 1;

    Config.gui.diagramCtx.clearRect(0, 0, $("#diagramCanvas").attr("width"), ctxHeight);
	
    _.each(neighbours, function (n) {
        maxDistance = Math.max(maxDistance, n[1]);
    });

    scaleFactor = (ctxWidth - 20) / 2 / maxDistance;


    //NEIGHBOURS
    var angle, color, cName;

    var circlePart= Math.PI * 2 / Config.classes.amount;

    _.each(neighbours, function (n) {
		
		cName = Config.trainingData.data[ n[0] ][Config.trainingData.classIndex];
		angle = Config.classes.getIndexByClassName(cName) * circlePart + Math.random() * circlePart + 1.5 * Math.PI;
	
		
        Config.gui.diagramCtx.fillStyle = Config.classes.getColorByClassName(cName);
        Config.gui.diagramCtx.beginPath();

        Config.gui.diagramCtx.arc(
        ctxWidth / 2 + Math.cos(angle) * n[1] * scaleFactor, ctxHeight / 2 + Math.sin(angle) * n[1] * scaleFactor, 3, 0, Math.PI * 2, true);

        Config.gui.diagramCtx.fill();

    });


     Config.gui.diagramCtx.fillStyle = "#FFFFFF";
     Config.gui.diagramCtx.strokeStyle = "#FFFFFF";

    //SIGMA
    if ($("#kernelFuncNameInput").val() !== "none") {

         Config.gui.diagramCtx.font = "9pt Verdana";
         Config.gui.diagramCtx.textAlign = "right";

         Config.gui.diagramCtx.beginPath();
         Config.gui.diagramCtx.arc(ctxWidth / 2, ctxHeight / 2, sigma * scaleFactor, 0, Math.PI * 2, true);
         Config.gui.diagramCtx.stroke();

        //SIGMA LABEL
         Config.gui.diagramCtx.fillText("σ (sigma)", $("#diagramCanvas").attr("width"), ctxHeight - 17);


        //INCREASED SIGMA
        if (increasedSigma > 0) {
             Config.gui.diagramCtx.fillStyle = "#a98564";
             Config.gui.diagramCtx.strokeStyle = "#a98564";
             Config.gui.diagramCtx.beginPath();
             Config.gui.diagramCtx.arc(ctxWidth / 2, ctxHeight / 2, increasedSigma * scaleFactor, 0, Math.PI * 2, true);
             Config.gui.diagramCtx.stroke();

            //INCREASED SIGMA LABEL
             Config.gui.diagramCtx.fillText("increased σ (sigma)", $("#diagramCanvas").attr("width"), ctxHeight - 2);
        }
    }


    //TESTDATASET
    Config.gui.diagramCtx.fillStyle = "#ffffff";
    Config.gui.diagramCtx.beginPath();
    Config.gui.diagramCtx.arc(ctxWidth / 2, ctxHeight / 2, 3, 0, Math.PI * 2, true);
    Config.gui.diagramCtx.fill();
}




//UTIL FUNCTIONS
Math.roundDec = function (n, dec) {
    return Math.round(n * Math.pow(10, 2)) / Math.pow(10, 2);
};