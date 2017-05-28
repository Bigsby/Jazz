(function () {
    //var filePath = "TakeATrain.xml";
    var filePath = "BeautifulLove.xml";
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            buildScore(xhttp.responseXML);
        }
    };
    xhttp.open("GET", filePath, true);
    xhttp.send();

    function buildScore(xml) {
        function selectSingle(path, context) {
            return xml.evaluate(path, context || xml, null, XPathResult.ANY_TYPE, null).iterateNext();
        }

        function selectMany(path, context) {
            return xml.evaluate(path, context || xml, null, XPathResult.ANY_TYPE, null);
        }

        document.getElementById("title").innerText = selectSingle("score-partwise/work/work-title").textContent;
        var composerNode = selectSingle("score-partwise/identification/creator[@type='composer']");
        if (composerNode)
            document.getElementById("composer").innerText = composerNode.textContent;
        var topOffset = 150;

        VF = Vex.Flow;

        var scoreDiv = document.getElementById("score");
        var leftMargin = parseInt(selectSingle("score-partwise/defaults/system-layout/system-margins/left-margin").textContent);

        var renderer = new VF.Renderer(scoreDiv, VF.Renderer.Backends.SVG);
        renderer.resize(
            parseInt(selectSingle("score-partwise/defaults/page-layout/page-width").textContent) - (leftMargin * 5),
            parseInt(selectSingle("score-partwise/defaults/page-layout/page-height").textContent) - topOffset);
        var formatter = new VF.Formatter();

        var context = renderer.getContext();

        var currentMeasureCount = 0;

        var currentX = leftMargin;
        var endingOffset = 20;
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
                        stave.setVoltaType(VF.Volta.type.BEGIN, endingNumber + ".", endingOffset);
                        stave.ending = {
                            number: endingNumber
                        };
                        return true;
                    case "stop":
                        if (stave.ending) {
                            stave.setVoltaType(VF.Volta.type.BEGIN_END, endingNumber + ".", endingOffset);
                        } else {
                            stave.setVoltaType(VF.Volta.type.END, "", endingOffset);
                        }
                        return false;
                    case "discontinue":
                        return false;
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
                case "natural":
                    return "n";
            }
        }

        function addAccidentals(note, accidentalsNode) {
            if (!accidentalsNode)
                return;

            note.addAccidental(0, new VF.Accidental(buildAccidental(accidentalsNode.textContent)));
        }

        function addArticulation(note, notationNode) {
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

        function buildNote(noteNode) {
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

            var stemNode = selectSingle("stem", noteNode);
            if (stemNode) {
                note.setStemDirection(stemNode.textContent === "up" ? 1 : -1);
            }

            addAccidentals(note, selectSingle("accidental", noteNode));
            if (dotNode)
                note.addDotToAll();

            var notationNodes = selectMany("notations/*", noteNode);
            var currentNotation = notationNodes.iterateNext();
            while (currentNotation) {
                addArticulation(note, currentNotation);
                currentNotation = notationNodes.iterateNext();
            }

            return note;
        }

        function buildHarmonySuperscript(kind) {
            switch (kind) {
                case "major":
                    return "";
                case "dominant":
                    return "7";
                case "minor-seventh":
                    return "7";
            }
        }

        function buildHarmonySubscript(harmonyNode) {
            var degreeNode = selectSingle("degree", harmonyNode);
            if (!degreeNode)
                return "";

            var text = "";
            switch (selectSingle("degree-alter", degreeNode).textContent) {
                case "-1":
                    text = VF.unicode["flat"];
                    break;
                case "1":
                    text = VF.unicode["sharp"];
                    break;
            }

            return text + selectSingle("degree-value", degreeNode).textContent;
        }

        function buildHarmony(harmonyNode) {
            var text = selectSingle("root/root-step", harmonyNode).textContent;
            var kind = selectSingle("kind", harmonyNode).textContent;
            if (kind.startsWith("minor"))
                text += " -";
            return {
                text: text,
                superscript: buildHarmonySuperscript(kind),
                subscript: buildHarmonySubscript(harmonyNode),
                font: {
                    family: "Arial",
                    size: 16,
                    weight: "bold"
                }
            };
        }

        function calculateHarmonyDuration(durations) {
            if (!durations.length)
                return "";
            if (durations.length == 1)
                return durations[0];
        }

        var measuresPath = "score-partwise/part//measure";

        function setCoordinates(layoutNode) {
            var topSystemDistanceNode = selectSingle("top-system-distance", layoutNode);
            if (topSystemDistanceNode) {
                currentY = parseInt(topSystemDistanceNode.textContent) - topOffset;
            } else {
                currentY += parseInt(selectSingle("system-distance", layoutNode).textContent);
                currentX = leftMargin;
            }
        }

        if (xml.evaluate) {
            var measures = selectMany(measuresPath);
            var currentMeasure = measures.iterateNext();
            var isVoltaOnGoing = false;

            while (currentMeasure) {
                var measureWidth = parseInt(currentMeasure.getAttribute("width"));
                var layoutNode = selectSingle("print/system-layout", currentMeasure);

                if (layoutNode)
                    setCoordinates(layoutNode);

                var stave = new VF.Stave(currentX, currentY, measureWidth);
                stave.setContext(context);

                if (isVoltaOnGoing)
                    stave.setVoltaType(VF.Volta.type.MID, "", endingOffset);

                var notes = [];
                var harmonies = [];

                var measureChildren = selectMany("*", currentMeasure);
                var measureChild = measureChildren.iterateNext();
                var lastTieStart;
                var pendingHarmony;
                var hasHarmony = false;

                while (measureChild) {
                    switch (measureChild.nodeName) {
                        case "attributes":
                            addStaveAttributes(measureChild, stave);
                            break;
                        case "barline":
                            isVoltaOnGoing |= addBarline(measureChild, stave);
                            break;
                        case "direction":
                            addDirection(measureChild, stave);
                            break;
                        case "note":
                            var note = buildNote(measureChild);
                            notes.push(note);
                            if (pendingHarmony) {
                                pendingHarmony.duration = note.duration;
                                harmonies.push(new VF.TextNote(pendingHarmony).setContext(context));
                                pendingHarmony = null;
                            } else {
                                harmonies.push(new VF.TextNote({
                                    text: "",
                                    duration: note.duration
                                }).setContext(context));
                            }
                            break;
                        case "harmony":
                            hasHarmony = true;
                            pendingHarmony = buildHarmony(measureChild);
                    }
                    measureChild = measureChildren.iterateNext();
                }

                stave.draw();

                var notesVoice = new VF.Voice(VF.TIME4_4).setMode(VF.Voice.Mode.FULL).addTickables(notes);
                var beams = VF.Beam.applyAndGetBeams(notesVoice);
                var voices = [notesVoice];

                if (hasHarmony)
                    voices.push(new VF.Voice(VF.TIME4_4).addTickables(harmonies).setMode(VF.Voice.Mode.FULL));

                formatter.joinVoices(voices).formatToStave(voices, stave);
                voices.forEach(function (voice) { voice.draw(context, stave); });
                beams.forEach(function (b) { b.setContext(context).draw(); });

                notes.forEach(function (note) {
                    if (note.isTieEnd) {
                        new VF.StaveTie({
                            first_note: lastTieStart,
                            last_note: note,
                            first_indices: [0],
                            last_indices: [0],
                        }).setContext(context).draw();
                        lastTieStart = null;
                    }
                    if (note.isTieStart)
                        lastTieStart = note;
                });

                currentMeasure = measures.iterateNext();
                currentX += measureWidth;
            }
        }
    }
})();

//TODO
// (optionals)
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