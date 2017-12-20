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
    private enum ServerType { LOGIN, REGISTER, CREATE_GAME, JOIN_GAME, MOVE, SURRENDER };
    private enum ClientType { LOGIN_RESULT, GAME_STATE };

    private TcpClient client = new TcpClient();
    private NetworkStream stream;

    void Start()
    {
        try
        {
            client.Connect("127.0.0.1", 5000);
            stream = client.GetStream();
            Debug.Log("Connected");
        }
        catch
        {
            Debug.LogError("Could not connect to server");
        }
    }

    void Update()
    {
        if (stream != null && stream.DataAvailable)
        {
            byte[] bytes = new byte[client.Available];
            stream.Read(bytes, 0, bytes.Length);
            string data = Encoding.UTF8.GetString(bytes);
            print(data);
        }
    }

    public void Register(string username, string password)
    {
        List<byte> b = new List<byte>();
        WriteInt(b, (int)ServerType.REGISTER);
        WriteString(b, username);
        //WriteString(b, GetHashSha256(password));
        WriteString(b, password);
        stream.Write(b.ToArray(), 0, b.Count);
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

    string GetHashSha256(string text)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(text);
        SHA256Managed hashstring = new SHA256Managed();
        byte[] hash = hashstring.ComputeHash(bytes);
        string hashString = string.Empty;
        foreach (byte b in hash)
            hashString += string.Format("{0:X2}", b);

        return hashString;
    }
}
