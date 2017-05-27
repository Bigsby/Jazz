(function () {
    VF = Vex.Flow;

    // Create an SVG renderer and attach it to the DIV element named "boo".
    var div = document.getElementById("container")
    var renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);

    // Configure the rendering context.
    renderer.resize(500, 500);
    var context = renderer.getContext();
    context.setFont("Arial", 10, "");//.setBackgroundFillStyle("#eed");

    // Create a stave of width 400 at position 10, 40 on the canvas.
    var stave = new VF.Stave(10, 40, 410);
    stave.setContext(context);
    // Add a clef and time signature.
    stave.addClef("treble").addTimeSignature("4/4");
    stave.draw();

    var notes = [
        new VF.StaveNote({ clef: "treble", keys: ["c/5"], duration: "q" }),
        new VF.StaveNote({ clef: "treble", keys: ["d/4"], duration: "q" }),
        new VF.StaveNote({ clef: "treble", keys: ["b/4"], duration: "qr" }),
        new VF.StaveNote({ clef: "treble", keys: ["c/4", "e/4", "g/4"], duration: "q" })
    ];

    var notes2 = [
        new VF.StaveNote({ clef: "treble", keys: ["c/4"], duration: "w" })
    ];

    var text = [
        new VF.TextNote({ text: "C", superscript: VF.unicode["triangle"] + "7", subscript: "", duration: "w" }).setContext(context)
    ];

    //text[0].setContext(context);

    // Create a voice in 4/4 and add above notes
    var voices = [
        new VF.Voice({ num_beats: 4, beat_value: 4 }).addTickables(text),
        new VF.Voice({ num_beats: 4, beat_value: 4 }).addTickables(notes),
        new VF.Voice({ num_beats: 4, beat_value: 4 }).addTickables(notes2)]

    // Format and justify the notes to 400 pixels.
    var formatter = new VF.Formatter().joinVoices(voices).format(voices, 400);

    
    // Render voices
    voices.forEach(function (v) { v.draw(context, stave); });
    
})();