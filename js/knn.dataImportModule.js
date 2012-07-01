function dataImportModule($, _, window, model) {


    var radioButtonChangeHandler = function (e) {
            model.mode = $(this).val();

            if ($(this).val() === "custom") {
                if (model.trainingData.data != null && model.testData.data != null) {
                    enableApplicationStartButton(true);
                    return;
                }
            } else {
                enableApplicationStartButton(true);
                return;
            }

            enableApplicationStartButton(false);
        }



    var enableApplicationStartButton = function (val) {
            if (val) $(".ui-dialog-buttonset>button").removeAttr("disabled");
            else $(".ui-dialog-buttonset>button").attr("disabled", "disabled");
        }


    var handleFileSelection = function (e) {
            if (e.target.id === "trainingDataInput") {
                model.trainingData.file = e.target.files[0];
                $("#trainingDataParseBtn").removeAttr("disabled");
            } else {
                model.testData.file = e.target.files[0];
                $("#testDataParseBtn").removeAttr("disabled");
            }
        }


    var handleFileParseCommand = function (e) {
            var reader = new FileReader();
            var fileData, data, targetDataset;

            targetDataset = (e.target.id === "trainingDataParseBtn") ? model.trainingData : model.testData;

            reader.onloadend = function (file) {
                fileData = file.target.result;
                data = parseDataFromString(fileData);

                //if classIndex is in the first line of imported file
                if (data[0].length === 1) {
                    targetDataset.classIndex = parseInt(data.splice(0, 1)[0][0]) - 1;
                }

                targetDataset.data = data;

                if (targetDataset === model.trainingData) {
                    model.classes.names = getClassInfoFromDataset(targetDataset.data, targetDataset.classIndex);
                    updateClassInfos();
                }
                updateDataImportGUI();
            }

            reader.readAsText(targetDataset.file);
        }


    var parseDataFromString = function (dataString) {

            var lines = dataString.split(/\n|\r|\r\n/g),
                result = [];


            var i, attrAsFloat, attributes;

            for (i = 0; i < lines.length; i++) {
                //if there are blank lines, skip them,
                if (lines[i].length === 0) continue;
                attributes = lines[i].match(/\S+\s*/g);

                result[i] = _.map(attributes, function (attr) {
                    attrAsFloat = parseFloat(attr);
                    return (isNaN(attrAsFloat)) ? attr.replace(" ", "") : attrAsFloat;
                });

            }

            return _.compact(result);

        }

    var getClassInfoFromDataset = function (dataset, classAttributeIndex) {
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


    var handleSettingsChange = function (e) {

            if (e.target.id === "twoDimensionalDataValue") {
                model.gui.dataHasXYPairs = $("#twoDimensionalDataValue").is(":checked");
                return;
            }

            var val = parseInt($(this).val());

            if (e.target.id === "trainingDataClassIndex") {
                if (isNaN(val) || val < 0) {
                    window.alert("This must be a positive integer.");
                    return;
                }
                model.trainingData.classIndex = parseInt($("#trainingDataClassIndex").val() - 1);
                updateClassInfos();
            } else {
                if (!isNaN(val) && val >= 0) {
                    model.testData.classIndex = parseInt($("#testDataClassIndex").val() - 1);
                } else model.testData.classIndex = -1;
            }

            updateDataImportGUI();

        }


    var loadExample = function () {
		
			//show loading-icon
			$("#exampleLoaderAni").show();
			
            var trainingDataUrl, testDataUrl, trainingClassIndex, testClassIndex;

            if (model.mode === "ex-characters") {
                trainingDataUrl = "data/digits-train.json";
                testDataUrl = "data/digits-test.json";
                trainingClassIndex = testClassIndex = 16;
                model.gui.dataHasXYPairs = true;
            } else if (model.mode === "ex-oils") {
                trainingDataUrl = "data/oils-train.json";
                testDataUrl = "data/oils-test.json";
                trainingClassIndex = testClassIndex = 8;
                model.gui.dataHasXYPairs = true;
            } else {
                //generate random Data
                generateRandomData();
                updateClassInfos();
                return;

            }

            $.ajax({
                dataType: "json",
                url: trainingDataUrl,
                async: false,
                success: function (e) {
                    model.trainingData.data = e.data;
                    model.trainingData.classIndex = trainingClassIndex;
                    updateClassInfos();
                }
            });

            $.ajax({
                dataType: "json",
                url: testDataUrl,
                async: false,
                success: function (e) {
                    model.testData.data = e.data;
                    model.testData.classIndex = testClassIndex;
                }
            });

			//hide loading-icon
			$("#exampleLoaderAni").hide();

        }

    var updateDataImportGUI = function () {
            if (model.trainingData.data) {
                $("#trainingDatasetsAmount").html("<em>" + model.trainingData.data.length + "</em> records x <em>" + (model.trainingData.data[1].length) + "</em> attributes");
                $("#trainingDataClassIndex").val((model.trainingData.classIndex < 0) ? -1 : model.trainingData.classIndex + 1);
            }

            if (model.testData.data) {
                $("#testDatasetsAmount").html("<em>" + model.testData.data.length + "</em> records x <em>" + (model.testData.data[1].length) + "</em> attributes");
                $("#testDataClassIndex").val((model.testData.classIndex < 0) ? -1 : model.testData.classIndex + 1);
            }

            $("#classesAmount").text(model.classes.amount);

            //check if ready to start
            if (model.trainingData.data !== null && model.testData.data !== null) {
                enableApplicationStartButton(true);
            }
        }



    var updateClassInfos = function () {
            model.classes.names = getClassInfoFromDataset(model.trainingData.data, model.trainingData.classIndex);
            model.classes.amount = model.classes.names.length;
            model.classes.colors = getRandomColors(model.classes.amount);
        }


    var generateRandomData = function () {
            var classes = ["ABC", "CAB", "BAC", "BCA", "ACB", "CBA"],
                maxAttributeValue = 300,
                maxAttributeAmount = 39;

            var trainingData = [],
                testData = [];

            for (var i = 0; i < 10000; i++) {

                testData[i] = [];
                trainingData[i] = [];

                for (var j = 0; j < maxAttributeAmount; j++) {

                    if (j % (maxAttributeAmount - 1) === 0 && j > 0) {
                        trainingData[i].push(classes[Math.random() * classes.length | 0]);
                        continue;
                    }

                    testData[i].push(Math.random() * maxAttributeValue | 0);
                    trainingData[i].push(Math.random() * maxAttributeValue | 0);
                }
            }

            model.trainingData.data = trainingData;
            model.testData.data = testData;
            model.trainingData.classIndex = maxAttributeAmount - 1;
            model.testData.classIndex = -1;
            model.gui.dataHasXYPairs = true;

        }





    var getRandomColors = function (amount) {
            var colors = [],
                angle = 360 / amount;

            var i;

            for (i = 0; i < amount; i++) {
                colors.push(hsvToRgb(angle * i, 95, 100));
            }
            return colors;
        }


    var hsvToRgb = function (h, s, v) {
            var r, g, b;
            var i;
            var f, p, q, t;

            h = Math.max(0, Math.min(360, h));
            s = Math.max(0, Math.min(100, s));
            v = Math.max(0, Math.min(100, v));

            s /= 100;
            v /= 100;

            if (s == 0) {
                r = g = b = v;
                return rgbToHex((r * 255) | 0, (g * 255) | 0, (b * 255) | 0);
            }

            h /= 60;
            i = Math.floor(h);
            f = h - i;
            p = v * (1 - s);
            q = v * (1 - s * f);
            t = v * (1 - s * (1 - f));

            switch (i) {
            case 0:
                r = v;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = v;
                b = p;
                break;
            case 2:
                r = p;
                g = v;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = v;
                break;
            case 4:
                r = t;
                g = p;
                b = v;
                break;
            default:
                r = v;
                g = p;
                b = q;
            }

            return rgbToHex((r * 255) | 0, (g * 255) | 0, (b * 255) | 0);
        }

    var rgbToHex = function (r, g, b) {
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }


    return {
        getRandomColors: getRandomColors,
        radioButtonChangeHandler: radioButtonChangeHandler,
        enableApplicationStartButton: enableApplicationStartButton,
        handleFileSelection: handleFileSelection,
        handleSettingsChange: handleSettingsChange,
        handleFileParseCommand: handleFileParseCommand,
        loadExample: loadExample,
        updateClassInfos: updateClassInfos
    }

}