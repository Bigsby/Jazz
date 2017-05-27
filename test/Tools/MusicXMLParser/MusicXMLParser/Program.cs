using System.IO;
using System.Xml.Serialization;

namespace MusicXMLParser
{
    class Program
    {
        const string _samplePath = @"C:\Git\Bigsby\Music\Samples\Take the 'A' Train.xml";
        static void Main(string[] args)
        {
            var serializer = new XmlSerializer(typeof(scorepartwise));
            var des = serializer.Deserialize(File.OpenRead(_samplePath));
            var stop = "";
        }
    }
}
