(function () {
    var titleElement = document.getElementById("title");
    var composerElement = document.getElementById("composer");
    var scoreDiv = document.getElementById("score");



    function getFileAndBuildScore(filePath) {
        titleElement.innerText = "Loading...";
        composerElement.innerText = "";
        scoreDiv.innerHTML = "";

        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                buildScore(xhttp.responseXML);
            }
        };
        xhttp.open("GET", filePath, true);
        xhttp.send();
    }

    var selectScore = document.getElementById("selectScore");
    function selectionChanged() {
        getFileAndBuildScore(selectScore.options[selectScore.selectedIndex].value);
    }
    selectScore.onchange = selectionChanged;
    selectionChanged();

    function buildScore(xml) {
        function selectSingle(path, context) {
            return xml.evaluate(path, context || xml, null, XPathResult.ANY_TYPE, null).iterateNext();
        }

        function selectMany(path, context) {
            return xml.evaluate(path, context || xml, null, XPathResult.ANY_TYPE, null);
        }

        titleElement.innerText = selectSingle("score-partwise/work/work-title").textContent;
        var composerNode = selectSingle("score-partwise/identification/creator[@type='composer']");
        if (composerNode)
            composerElement.innerText = composerNode.textContent;
        var topOffset = 150;

        VF = Vex.Flow;
        var options = {
            "minorSymbol": "m",
            "majorSeventhSymbol": VF.unicode["triangle"],
            "diminishedSymbol": VF.unicode["circle"],
            "augmentedSymbol": "+",
            "halfDiminishedSymbol": VF.unicode["o-with-slash"],
            "harmonyFont": {
                family: "Arial",
                size: 16,
                weight: "bold"
            },
            "endingOffset": 0
        };
        var leftMargin = parseInt(selectSingle("score-partwise/defaults/system-layout/system-margins/left-margin").textContent);

        var renderer = new VF.Renderer(scoreDiv, VF.Renderer.Backends.SVG);
        renderer.resize(
            parseInt(selectSingle("score-partwise/defaults/page-layout/page-width").textContent) - (leftMargin * 5),
            parseInt(selectSingle("score-partwise/defaults/page-layout/page-height").textContent) - topOffset);
        var formatter = new VF.Formatter();

        var context = renderer.getContext();

        var currentMeasureCount = 0;

        var currentX = leftMargin;
        var currentY = 0;

        function getKey(value) {
            switch (value) {
                case 1: return "G";
                case 2: return "D";
                case 3: return "A";
                case 4: return "E";
                case 5: return "B";
                case 6: return "F#";
                case 7: return "C#";
                case -1: return "F";
                case -2: return "Bb";
                case -3: return "Eb";
                case -4: return "Ab";
                case -5: return "Db";
                case -6: return "Gb";
                case -7: return "Cb";
            }
            return "C";
        }

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

            var keyNode = selectSingle("key", attributesNode);
            if (keyNode) {
                stave.addKeySignature(getKey(parseInt(selectSingle("fifths", keyNode).textContent)));
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
                        stave.setBegBarType(VF.Barline.type.REPEAT_BEGIN);
                        break;
                }
            }

            var endingNode = selectSingle("ending", barlineNode);
            if (endingNode) {
                var endingNumber = endingNode.getAttribute("number");

                switch (endingNode.getAttribute("type")) {
                    case "start":
                        stave.setVoltaType(VF.Volta.type.BEGIN, endingNumber + ".", options.endingOffset);
                        stave.ending = {
                            number: endingNumber
                        };
                        stave.continueVolta = true;
                        break;
                    case "stop":
                        if (stave.ending) {
                            stave.setVoltaType(VF.Volta.type.BEGIN_END, endingNumber + ".", options.endingOffset);
                        } else {
                            stave.setVoltaType(VF.Volta.type.END, "", options.endingOffset);
                        }
                        stave.continueVolta = false;
                        break;
                    case "discontinue":
                        stave.continueVolta = false;
                        break;
                }
            }
        }

        function buildDotText(dotNode) {
            return dotNode ? "d" : "";
        }

        function buildDuration(duration) {
            switch (duration) {
                case "256th":
                    return "256";
                case "128th":
                    return "128";
                case "64th":
                    return "64";
                case "32nd":
                    return "32";
                case "16th":
                    return "16";
                case "eighth":
                    return "8";
                case "quarter":
                    return "4";
                case "half":
                    return "2";
                case "whole":
                    return "1";
                case "breve":
                    return "1/2";
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
                case "double-sharp":
                case "sharp-sharp":
                    return "##";
                case "flat-flat":
                    return "bb";
            }
        }

        function addAccidentals(note, accidentalsNode) {
            if (!accidentalsNode)
                return;
            var accidental = new VF.Accidental(buildAccidental(accidentalsNode.textContent));
            if (accidentalsNode.getAttribute("cautionary") === "yes")
                accidental.setAsCautionary();
            note.addAccidental(0, accidental);
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

            if (selectSingle("time-modification", noteNode))
                note.isTuplet = true;

            return note;
        }

        var harmonyKinds = {
            "major": "",
            "minor": options.minorSymbol,
            "augmented": options.augmentedSymbol,
            "diminished": options.diminishedSymbol,
            "dominant": "7",
            "major-seventh": options.majorSeventhSymbol,
            "minor-seventh": options.minorSymbol + "7",
            "diminished-seventh": options.diminishedSymbol + "7",
            "augmented-seventh": options.augmentedSymbol + "7",
            "half-diminished": options.halfDiminishedSymbol,
            "major-minor": options.minorSymbol + options.majorSeventhSymbol,
            "major-sixth": "(6)",
            "minor-sixth": options.minorSymbol + "(6)",
            "dominant-ninth": "7(9)",
            "major-ninth": "(9)",
            "minor-ninth": options.minorSymbol + "(9)",
            "dominant-11th": "7(11)",
            "major-11th": "(11)",
            "minor-11th": options.minorSymbol + "(11)",
            "dominant-13th": "7(13)",
            "major-13th": "(13)",
            "minor-13th": options.minorSymbol + "(13)",
            "suspended-second": "sus2",
            "suspended-fourth": "sus4"
        };

        function buildHarmonySuperscript(kind) {
            return harmonyKinds[kind];
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

        function buildHarmonyAlter(value) {
            switch (value) {
                case "1":
                    return VF.unicode["sharp"];
                case "-1":
                    return VF.unicode["flat"];
            }
        }

        function buildHarmony(harmonyNode) {
            var text = selectSingle("root/root-step", harmonyNode).textContent;
            var rootAlterNode = selectSingle("root/root-alter", harmonyNode);
            if (rootAlterNode) {
                text += buildHarmonyAlter(rootAlterNode.textContent);
            }

            text += harmonyKinds[selectSingle("kind", harmonyNode).textContent];

            var bassNode = selectSingle("bass");
            if (bassNode) {
                text += "/" + selectSingle("base-step", bassNode).textContent;
                var bassAlterNode = selectionChanged("bass-alter", bassNode);
                if (bassAlterNode) {
                    text += buildHarmonyAlter(bassAlterNode.textContent);
                }
            }
            return {
                text: text,
                superscript: buildHarmonySubscript(harmonyNode),
                subscript: "",
                font: options.harmonyFont
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
                    stave.setVoltaType(VF.Volta.type.MID, "", options.endingOffset);

                var notes = [];
                var harmonies = [];

                var measureChildren = selectMany("*", currentMeasure);
                var measureChild = measureChildren.iterateNext();
                var lastTieStart;
                var pendingHarmony;
                var hasHarmony = false;
                var tupletNotes = [];
                var tuplets = [];

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
                            var note = buildNote(measureChild);
                            notes.push(note);
                            if (note.isTuplet)
                                tupletNotes.push(note);
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

                            if (!note.isTuplet && tupletNotes.length) {
                                tuplets.push(new VF.Tuplet(tupletNotes));
                                tupletNotes = [];
                            }
                            break;
                        case "harmony":
                            hasHarmony = true;
                            pendingHarmony = buildHarmony(measureChild);
                    }
                    measureChild = measureChildren.iterateNext();
                }

                stave.draw();
                isVoltaOnGoing = stave.continueVolta;

                if (tupletNotes.length) {
                    tuplets.push(new VF.Tuplet(tupletNotes));
                }

                var notesVoice = new VF.Voice(VF.TIME4_4);
                notesVoice.setStrict(false);
                notesVoice.addTickables(notes);
                var beams = VF.Beam.applyAndGetBeams(notesVoice);
                var voices = [notesVoice];

                if (hasHarmony)
                    voices.push(new VF.Voice(VF.TIME4_4).setMode(VF.Voice.Mode.FULL).setStrict(false).addTickables(harmonies));

                formatter.joinVoices(voices).formatToStave(voices, stave);
                voices.forEach(function (voice) { voice.draw(context, stave); });

                beams.forEach(function (b) { b.setContext(context).draw(); });

                tuplets.forEach(function (tuplet) { tuplet.setContext(context).draw() });

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
// degree-symbol-value
// degree-type-value
// beam
// slur
// kind-value -- check extensions
// articulations - staccato
// bar-style
// barline - segno
// beam-value
// clef-sign
// notehead-value
// group-symbol-value
// position
// dynamics
// multiple-rest
// direction-type
// breath-mark
// glissando
// grace
// harmonic
// lyric
// notations
// note
// rest
// stem
// tremolo
// traditional-key - cancel