(function () {
    var filePath = "TakeATrain.xml";
    var xhttp = new XMLHttpRequest();
    var xml;
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            xml = xhttp.responseXML;
            buildOutput();
            buildScore();
        }
    };
    xhttp.open("GET", filePath, true);
    xhttp.send();

    function selectSingle(path, context) {
        return xml.evaluate(path, context || xml, null, XPathResult.ANY_TYPE, null).iterateNext();
    }

    function selectMany(path, context) {
        return xml.evaluate(path, context || xml, null, XPathResult.ANY_TYPE, null);
    }

    function buildScore() {

        function addStaveAttributes(attributesNode, stave) {
            var clefNode = selectSingle("clef", attributesNode);
            if (clefNode) {
                switch (selectSingle("sign", clefNode).textContent) {
                    case "G":
                        stave.addClef("treble");
                        break;
                    case "F":
                        stave.addClef("bass");
                        break;
                }
            }

            var timeNode = selectSingle("time", attributesNode);
            if (timeNode) {
                stave.addTimeSignature(selectSingle("beats", timeNode).textContent + "/" + selectSingle("beat-type", timeNode).textContent);
            }
        }

        function buildDotText(dotNode) {
            return dotNode ? "d" : "";
        }

        function buildDuration(duration) {
            switch (duration) {
                case "eighth":
                    return "8";
                case "half":
                    return "h";
                case "quarter":
                    return "q";
                case "whole":
                    return "w";
            }
        }

        function buildRest(restNode) {
            return restNode ? "r" : "";
        }

        function buildAccidental(accidental) {
            switch (accidental) {
                case "sharp":
                    return "#";
                case "flat":
                    return "b";
            }
        }

        function addAccidentals(note, accidentalsNode) {
            if (!accidentalsNode)
                return;

            note.addAccidental(0, new VF.Accidental(buildAccidental(accidentalsNode.textContent)));
        }

        function buildNote(noteNode) {
            var pitchText = "b/4";
            var pitchNode = selectSingle("pitch", noteNode);
            if (pitchNode) {
                pitchText = selectSingle("step", pitchNode).textContent;
                pitchText += "/" + selectSingle("octave", pitchNode).textContent;
            }

            var dotNode = selectSingle("dot", noteNode);

            var result = new VF.StaveNote({
                keys: [pitchText],
                duration:
                buildDuration(selectSingle("type", noteNode).textContent)
                + buildRest(selectSingle("rest", noteNode))
                + buildDotText(dotNode)
            });

            addAccidentals(result, selectSingle("accidental", noteNode));
            if (dotNode)
            result.addDotToAll();

            return result;
        }

        VF = Vex.Flow;

        var scoreDiv = document.getElementById("score")
        var renderer = new VF.Renderer(scoreDiv, VF.Renderer.Backends.SVG);
        var formatter = new VF.Formatter();

        var context = renderer.getContext();
        context.setFont("Arial", 10, "");

        var currentMessureCount = 0;
        var systemCount = 1;
        var staveWidth = 380;
        var staveHeight = 100;
        var currentX = 0;
        var currentY = 0;

        var measuresPath = "score-partwise/part//measure";

        if (xml.evaluate) {
            var measures = selectMany(measuresPath);
            var currentMesure = measures.iterateNext();

            while (currentMesure) {
                currentMessureCount++;

                var stave = new VF.Stave(currentX, currentY, staveWidth);
                stave.setContext(context);

                var attributesNode = selectSingle("attributes", currentMesure);

                if (attributesNode) {
                    addStaveAttributes(attributesNode, stave);
                }

                stave.draw();

                var notes = [];

                var notesAndHarmonies = selectMany("*", currentMesure);
                var currentNoteOrHarmony = notesAndHarmonies.iterateNext();
                
                while (currentNoteOrHarmony) {

                    switch (currentNoteOrHarmony.nodeName) {
                        case "note":
                            notes.push(buildNote(currentNoteOrHarmony));
                            break;
                        case "harmony":
                            break;
                    }

                    currentNoteOrHarmony = notesAndHarmonies.iterateNext();
                }

                var beams = VF.Beam.generateBeams(notes);
                VF.Formatter.FormatAndDraw(context, stave, notes);
                beams.forEach(function (b) { b.setContext(context).draw() });

                currentMesure = measures.iterateNext();
                if (currentMessureCount == 4) {
                    currentMessureCount = 0;
                    currentX = 0;
                    systemCount++;
                    currentY += staveHeight;
                } else {
                    currentX += staveWidth;
                }
            }

            renderer.resize(staveWidth * 4, systemCount * staveHeight);
        }
    }

    function buildOutput() {

        function buildNoteText(noteNode) {
            var noteText = "";
            var pitchNode = selectSingle("pitch", noteNode);
            if (pitchNode) {
                noteText = selectSingle("step", pitchNode).textContent;
                noteText += selectSingle("octave", pitchNode).textContent;
            }

            var restNode = selectSingle("rest", noteNode);
            if (restNode) {
                noteText += "rest";
            }

            noteText += "-" + selectSingle("type", noteNode).textContent;
            return noteText;
        }

        function buildDegreeText(degreeNode) {
            return "degree";
        }

        function buildHarmonyText(harmonyNode) {
            var harmonyText = "";
            harmonyText += selectSingle("root/root-step", harmonyNode).textContent;
            harmonyText += " " + selectSingle("kind", harmonyNode).textContent;

            var degreeNodes = selectMany("degree", harmonyNode);
            var currentDegree = degreeNodes.iterateNext();

            if (currentDegree) {
                var degreesTexts = [];
                while (currentDegree) {
                    degreesTexts.push(buildDegreeText(currentDegree));
                    currentDegree = degreeNodes.iterateNext();
                }
                harmonyText += " ( " + degreesTexts.join(" ,") + " )";
            }
            return harmonyText;
        }

        function buildAttributesText(attributesNode) {
            var attributesText = "";

            var keyNode = selectSingle("key", attributesNode);
            if (keyNode) {
                attributesText += selectSingle("fifths", keyNode).textContent;
                attributesText += ", " + selectSingle("mode", keyNode).textContent;
            }

            var timeNode = selectSingle("time", attributesNode);
            if (timeNode) {
                attributesText += ", " + selectSingle("beats", timeNode).textContent;
                attributesText += "/" + selectSingle("beat-type", timeNode).textContent;
            }

            var clefNode = selectSingle("clef", attributesNode);
            if (clefNode) {
                attributesText += ", " + selectSingle("sign", clefNode).textContent + " clef";
            }

            return attributesText;
        }

        var measuresPath = "score-partwise/part//measure";
        var outputDiv = document.getElementById("output");
        if (xml.evaluate) {
            var measures = selectMany(measuresPath);
            var currentMesure = measures.iterateNext();

            while (currentMesure) {
                var measureSpan = document.createElement("span");
                var measureText = "Measure " + currentMesure.getAttribute("number");

                var attributesNode = selectSingle("attributes", currentMesure);

                if (attributesNode) {
                    measureText += " ( " + buildAttributesText(attributesNode) + " )";
                }


                measureText += " > [ ";

                var notesAndHarmonies = selectMany("*", currentMesure);
                var currentNoteOrHarmony = notesAndHarmonies.iterateNext();

                var notesAndHarmoniesTexts = [];
                while (currentNoteOrHarmony) {

                    switch (currentNoteOrHarmony.nodeName) {
                        case "note":
                            notesAndHarmoniesTexts.push(buildNoteText(currentNoteOrHarmony));
                            break;
                        case "harmony":
                            notesAndHarmoniesTexts.push(buildHarmonyText(currentNoteOrHarmony));
                            break;
                    }

                    currentNoteOrHarmony = notesAndHarmonies.iterateNext();
                }

                measureText += notesAndHarmoniesTexts.join(", ");

                measureText += " ]";

                measureSpan.innerHTML = measureText + "<br/>";
                outputDiv.appendChild(measureSpan);
                currentMesure = measures.iterateNext();
            }
        }
    }
})();