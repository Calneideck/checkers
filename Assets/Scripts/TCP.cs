using UnityEngine;
using UnityEngine.UI;
using System.Net.Sockets;
using System.Text;
using System.IO;
using System.Collections;
using System.Collections.Generic;
using System.Security.Cryptography;

public class TCP : MonoBehaviour
{
    private TcpClient client = new TcpClient();

    public InputField inp;
    public Text chatbox;

    void Start()
    {
        client.Connect("192.168.0.216", 5000);
    }

    void Update()
    {
        print(client.Connected);

        NetworkStream stream = client.GetStream();
        if (stream.DataAvailable)
        {
            byte[] bytes = new byte[client.Available];
            stream.Read(bytes, 0, bytes.Length);
            string data = Encoding.UTF8.GetString(bytes);
            chatbox.text += '\n' + data;
        }
    }

    public void Send()
    {
        if (!string.IsNullOrEmpty(inp.text))
        {
            NetworkStream stream = client.GetStream();
            List<byte> b = new List<byte>();
            WriteInt(b, 0);
            print(getHashSha256(inp.text));
            WriteString(b, getHashSha256(inp.text));
            //WriteFloat(b, 3.75f);
            //WriteString(b, "cat");
            //WriteInt(b, -129555);
            stream.Write(b.ToArray(), 0, b.Count);
        }
    }

    void WriteInt(List<byte> bytes, int data)
    {
        foreach (byte b in System.BitConverter.GetBytes(data))
            bytes.Add(b);
    }

    void WriteFloat(List<byte> bytes, float data)
    {
        foreach (byte b in System.BitConverter.GetBytes(data))
            bytes.Add(b);
    }

    void WriteString(List<byte> bytes, string data)
    {
        WriteInt(bytes, data.Length);
        foreach (byte b in Encoding.UTF8.GetBytes(data))
            bytes.Add(b);
    }

    string getHashSha256(string text)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(text);
        SHA256Managed hashstring = new SHA256Managed();
        byte[] hash = hashstring.ComputeHash(bytes);
        string hashString = string.Empty;
        foreach (byte x in hash)
            hashString += string.Format("{0:x2}", x);

        return hashString;
    }
}
