using System.Collections.Generic;

namespace MusicXMLParser.Models
{
    public class Score
    {
        public IEnumerable<Measure> Measures { get; set; }
    }

    public class Measure
    {

    }

    class MeasureAttributes
    {
        public int Divisions { get; set; }

    }

    public struct MeasureKey
    {
        public int Fifths { get; set; }

    }

    public enum KeyMode
    {
        Major,
        Minor
    }



}
