(function () {
    var filePath = "TakeATrain.xml";
    var xhttp = new XMLHttpRequest();
    var xml;
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            xml = xhttp.responseXML;
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

        VF = Vex.Flow;

        var scoreDiv = document.getElementById("score")
        var renderer = new VF.Renderer(scoreDiv, VF.Renderer.Backends.SVG);
        var formatter = new VF.Formatter();

        var context = renderer.getContext();
        context.setFont("Arial", 10, "");

        var currentMeasureCount = 0;
        var systemCount = 1;
        var staveWidth = 350;
        var staveHeight = 130;
        var currentX = 0;
        var currentY = 0;

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

        function addDirection(directionNode, stave) {
            // stave.setRepetitionTypeRight(VF.Repetition.type.CODA_RIGHT, 0)
            // NONE: 1,         // no coda or segno
            // CODA_LEFT: 2,    // coda at beginning of stave
            // CODA_RIGHT: 3,   // coda at end of stave
            // SEGNO_LEFT: 4,   // segno at beginning of stave
            // SEGNO_RIGHT: 5,  // segno at end of stave
            // DC: 6,           // D.C. at end of stave
            // DC_AL_CODA: 7,   // D.C. al coda at end of stave
            // DC_AL_FINE: 8,   // D.C. al Fine end of stave
            // DS: 9,           // D.S. at end of stave
            // DS_AL_CODA: 10,  // D.S. al coda at end of stave
            // DS_AL_FINE: 11,  // D.S. al Fine at end of stave
            // FINE: 12, 
            var codaNode = selectSingle("direction-type/coda", directionNode);
            if (codaNode) {
                var offsetNode = selectSingle("sound/offset", directionNode);
                if (offsetNode) {
                    stave.setRepetitionTypeRight(VF.Repetition.type.CODA_RIGHT, 0);
                } else {
                    stave.setRepetitionTypeLeft(VF.Repetition.type.CODA_LEFT, 0);
                }
            }
        }

        function addBarline(barlineNode, stave) {
            // stave.setEndBarType(VF.Barline.type.REPEAT_END);
            // VF.Barline.type: SINGLE: 1, DOUBLE: 2, END: 3, REPEAT_BEGIN: 4, REPEAT_END: 5, REPEAT_BOTH: 6, NONE: 7
            // stave..setMeasure(3); set barnumber
            // stave.setVoltaType(VF.Volta.type.BEGIN, "1.", -5);
            // VF.Volta.type:
            //  NONE: 1, BEGIN: 2, MID: 3, END: 4, BEGIN_END: 5
            var barStyleNode = selectSingle("bar-style", barlineNode);
            if (barStyleNode)
                switch (barStyleNode.textContent) {
                    case "light-heavy":
                        stave.setEndBarType(VF.Barline.type.END);
                        break;
                    case "light-light":
                        stave.setEndBarType(VF.Barline.type.DOUBLE);
                        break;
                }

            var repeatNode = selectSingle("repeat", barlineNode);
            if (repeatNode) {
                switch (barlineNode.getAttribute("location")) {
                    case "right":
                        stave.setEndBarType(VF.Barline.type.REPEAT_END);
                        break;
                    case "left":
                        stave.setBegBarType(VF.Barline.type.REPEAT_START);
                        break;
                }
            }

            var endingNode = selectSingle("ending", barlineNode);
            if (endingNode) {
                var endingNumber = endingNode.getAttribute("number");

                switch (endingNode.getAttribute("type")) {
                    case "start":
                        stave.setVoltaType(VF.Volta.type.BEGIN, endingNumber + ".", 5);
                        stave.ending = {
                            number: endingNumber
                        };
                        break;
                    case "stop":
                        if (stave.ending) {
                            stave.setVoltaType(VF.Volta.type.BEGIN_END, endingNumber + ".", 5);
                        } else {
                            stave.setVoltaType(VF.Volta.type.END, "", 5);
                        }
                        break;
                    case "discontinue":
                        break;
                }
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

        function addArticulation(note, notationNode, lastTieStart) {
            // LEFT: 1, RIGHT: 2, ABOVE: 3, BELOW: 4,
            switch (notationNode.nodeName) {
                case "fermata":
                    note.addArticulation(0, new VF.Articulation("a@a").setPosition(3));
                    break;
                case "tied":
                    if (notationNode.getAttribute("type") == "start") {
                        note.isTieStart = true;
                    } else {
                        note.isTieEnd = true;
                    }
                    break;
            }
        }

        function buildNote(noteNode, lastTieStart) {
            var pitchText = "b/4";
            var pitchNode = selectSingle("pitch", noteNode);
            if (pitchNode) {
                pitchText = selectSingle("step", pitchNode).textContent;
                pitchText += "/" + selectSingle("octave", pitchNode).textContent;
            }

            var dotNode = selectSingle("dot", noteNode);

            var note = new VF.StaveNote({
                keys: [pitchText],
                duration:
                buildDuration(selectSingle("type", noteNode).textContent)
                + buildRest(selectSingle("rest", noteNode))
                + buildDotText(dotNode)
            });

            addAccidentals(note, selectSingle("accidental", noteNode));
            if (dotNode)
                note.addDotToAll();

            var notationNodes = selectMany("notations/*", noteNode);
            var currentNotation = notationNodes.iterateNext();
            while (currentNotation) {
                addArticulation(note, currentNotation, lastTieStart);
                currentNotation = notationNodes.iterateNext();
            }

            return note;
        }

        var measuresPath = "score-partwise/part//measure";

        if (xml.evaluate) {
            var measures = selectMany(measuresPath);
            var currentMeasure = measures.iterateNext();

            while (currentMeasure) {
                currentMeasureCount++;

                var stave = new VF.Stave(currentX, currentY, staveWidth);
                stave.setContext(context);

                var notes = [];

                var measureChildren = selectMany("*", currentMeasure);
                var measureChild = measureChildren.iterateNext();
                var lastTieStart;

                while (measureChild) {
                    switch (measureChild.nodeName) {
                        case "attributes":
                            addStaveAttributes(measureChild, stave);
                            break;
                        case "barline":
                            addBarline(measureChild, stave);
                            break;
                        case "direction":
                            addDirection(measureChild, stave);
                            break;
                        case "note":
                            var note = buildNote(measureChild, lastTieStart);
                            if (note.isTieEnd)
                                lastTieStart = null;
                            if (note.isTieStart)
                                lastTieStart = note;
                            notes.push(note);
                            break;
                        case "harmony":
                            break;
                    }
                    measureChild = measureChildren.iterateNext();
                }

                stave.draw();

                var beams = VF.Beam.generateBeams(notes);

                VF.Formatter.FormatAndDraw(context, stave, notes);
                beams.forEach(function (b) { b.setContext(context).draw() });
                var voice = new VF.Voice(VF.TIME4_4);
                voice.addTickables(notes);
                formatter.joinVoices([voice]).formatToStave([voice], stave);
                voice.draw(context, stave);

                // new VF.StaveTie({
                //             first_note: lastTieStart,
                //             last_note: note,
                //             first_indices: [0],
                //             last_indices: [0],
                //         }).setContext(context).draw();

                currentMeasure = measures.iterateNext();
                if (currentMeasureCount == 4) {
                    currentMeasureCount = 0;
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
})();

//TODO
// ties
// harmony
// new system
// title and composer
// (optional)
// tempo direction
// change key

// Tests display - http://www.vexflow.com/tests/
// Tests source - http://www.vexflow.com/build/vexflow-tests.js

// VexFlow tables - https://github.com/0xfe/vexflow/blob/e107adf1b7c4512b4ec73d46b0e607332b5535b8/src/tables.js

// VexFlow source - https://github.com/0xfe/vexflow/tree/e107adf1b7c4512b4ec73d46b0e607332b5535b8/src

// VexFlow Wiki - https://github.com/0xfe/vexflow/wiki/Beams

// Sample PDF URI - file:///C:/Users/bigsb/Documents/Scores/Jazz%20Standards/Take%20the%20'A'%20Train%20-%20Full%20Score.pdf

// Sample MusicXML Path - C:\Git\Bigsby\Music\test\TakeATrain.xml

// MusicXML XSD Path - C:\Git\Bigsby\Music\Standards\musicxml.xsd