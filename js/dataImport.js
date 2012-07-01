function radioButtonChangeHandler(e) {
    Config.mode = $(this).val();

    if ($(this).val() === "custom") {
        if (Config.trainingData.data != null && Config.testData.data != null) {
            enableApplicationStartButton(true);
            return;
        }
    } else {
        enableApplicationStartButton(true);
        return;
    }

    enableApplicationStartButton(false);
}

function enableApplicationStartButton(val) {
    if (val) $(".ui-dialog-buttonset>button").removeAttr("disabled");
    else $(".ui-dialog-buttonset>button").attr("disabled", "disabled");
}

function handleFileSelection(e) {
    if (e.target.id === "trainingDataInput") {
        Config.trainingData.file = e.target.files[0];
        $("#trainingDataParseBtn").removeAttr("disabled");
    } else {
        Config.testData.file = e.target.files[0];
        $("#testDataParseBtn").removeAttr("disabled");
    }
}

function handleFileParseCommand(e) {
    var reader = new FileReader();
    var fileData, data, targetDataset;

    targetDataset = (e.target.id === "trainingDataParseBtn") ? Config.trainingData : Config.testData;

    reader.onloadend = function (file) {
        fileData = file.target.result;
        data = parseDataFromString(fileData, targetDataset.delimiter);

        //if classIndex is in the first line of imported file
        if (data[0].length === 1) {
            targetDataset.classIndex = data.splice(0, 1)[0][0];
        }

        targetDataset.data = data;


        if (targetDataset === Config.trainingData) {
			Config.classes.names = getClassInfoFromDataset(targetDataset.data, targetDataset.classIndex);
			updateClassInfos();
        }

        updateDataImportGUI();

    }

    reader.readAsText(targetDataset.file);
}


function parseDataFromString(dataString) {

    var lines = dataString.split(/\n|\r|\r\n/g),
        result = [];


    var i, attrAsFloat, attributes;

    for (i = 0; i < lines.length; i++) {
        attributes = lines[i].match(/\S+[\s|,|;]*/g);

        result[i] = _.map(attributes, function (attr) {
            attrAsFloat = parseFloat(attr);
            return (isNaN(attrAsFloat)) ? attr : attrAsFloat;
        });

    }

    return _.compact(result);

}

function getClassInfoFromDataset(dataset, classAttributeIndex) {
    var classes = {},
        classesArray = [];

    var i;

    for (i = 0; i < dataset.length; i++) {
        classes[dataset[i][classAttributeIndex]] = dataset[i][classAttributeIndex];
    }


    _.each(classes, function (val, key) {
        if (typeof val !== "undefined") classesArray.push(key);
    });

    return classesArray.sort();

}


function onSettingsChange(e) {

    if (e.target.id === "twoDimensionalDataValue") {
        Config.gui.dataHasXYPairs = $("#twoDimensionalDataValue").is(":checked");
		return;
    } 
    
	var dataSet, val;
        if (e.target.id === "trainingDataClassIndex") {
            dataSet = "trainingData";
            val = parseInt($("#trainingDataClassIndex").val());
        } else {
            dataSet = "testData";
            val = parseInt($("#testDataClassIndex").val());
        }

        if (isNaN(val) || val < 0) {
            window.alert("This must be a positive integer.");
        }
        Config[dataSet].classIndex = val;
    
}


function loadExample() {
    var trainingDataUrl, testDataUrl, trainingClassIndex, testClassIndex;

    if (Config.mode === "ex-characters") {
        trainingDataUrl = "data/digits-train.json";
        testDataUrl = "data/digits-test.json";
        trainingClassIndex = testClassIndex = 16;
		Config.gui.dataHasXYPairs = true;
    } else if(Config.mode === "ex-oils"){
        trainingDataUrl = "data/oils-train.json";
        testDataUrl = "data/oils-test.json";
        trainingClassIndex = testClassIndex = 8;
		Config.gui.dataHasXYPairs = false;
    }
	else{
		//generate random Data
		var classes= ["ABC", "CAB", "BAC", "BCA", "ACB", "CBA"];
		
		var trainingData = [],
			testData = [];
			
		for(var i=0;i<10000;i++){
			
			testData[i] =  [];
			trainingData[i] = [];
			
			for(var j=0;j<40;j++){
				
				if(j%39 === 0 && j>0){
					trainingData[i].push(classes[Math.random()*classes.length | 0]);
					continue;
				}
				
				testData[i].push(Math.random() * 600);
				trainingData[i].push(Math.random() * 600);
			}
		}
		 
		Config.trainingData.data = trainingData;
		Config.testData.data = testData;
        Config.trainingData.classIndex = 39;
		Config.testData.classIndex = -1;
		Config.gui.dataHasXYPairs = true;
		updateClassInfos();
		return;
	}	

    $.ajax({
        dataType: "json",
        url: trainingDataUrl,
        async: false,
        success: function (e) {
            Config.trainingData.data = e.data;
            Config.trainingData.classIndex = trainingClassIndex;
			updateClassInfos();
        }
    });

    $.ajax({
        dataType: "json",
        url: testDataUrl,
        async: false,
        success: function (e) {
            Config.testData.data = e.data;
            Config.testData.classIndex = testClassIndex;
        }
    });



}

function updateDataImportGUI() {
    if (Config.trainingData.data) {
        $("#trainingDatasetsAmount").html("<em>" + Config.trainingData.data.length + "</em> records x <em>" + Config.trainingData.data[1].length + "</em> attributes");
        $("#trainingDataClassIndex").val((Config.trainingData.classIndex < 0) ? "None" : Config.trainingData.classIndex);
    }

    if (Config.testData.data) {
       $("#testDatasetsAmount").html("<em>" + Config.testData.data.length + "</em> records x <em>" + Config.testData.data[1].length + "</em> attributes");
        $("#testDataClassIndex").val((Config.testData.classIndex < 0) ? "None" : Config.testData.classIndex);
    }

    //check if ready to start
    if (Config.trainingData.data !== null && Config.testData.data !== null) {
        enableApplicationStartButton(true);
    }
}

function updateClassInfos(){
	    Config.classes.names = getClassInfoFromDataset(Config.trainingData.data, Config.trainingData.classIndex);
        Config.classes.amount = Config.classes.names.length;
		Config.classes.colors = getRandomColors(Config.classes.amount);

}
