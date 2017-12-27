using UnityEngine;
using System.Net.Sockets;
using System.Text;
using System.Collections.Generic;
using System.Security.Cryptography;

public class TCP : MonoBehaviour
{
    private enum ServerType { LOGIN, REGISTER, CREATE_GAME, JOIN_GAME, MOVE, SURRENDER };
    private enum ClientType { LOGIN_RESULT, GAME_STATE };

    private TcpClient client = new TcpClient();
    private NetworkStream stream;

    private event System.Action<bool> loginCallback;
    private event System.Action<bool> registerCallback;

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
            // Get the data from the network stream
            byte[] bytes = new byte[client.Available];
            stream.Read(bytes, 0, bytes.Length);

            // Get message type
            int offset = 0;
            ClientType messageType = (ClientType)ReadInt(bytes, ref offset);

            switch (messageType)
            {
                case ClientType.LOGIN_RESULT:
                    int result = ReadInt(bytes, ref offset);
                    if (registerCallback != null)
                        registerCallback.Invoke(result == 1);
                    else if (loginCallback != null)
                        loginCallback.Invoke(result == 1);
                    break;

                case ClientType.GAME_STATE:
                    break;
            }
        }
    }

    public void LoginRegister(bool login, string username, string password, System.Action<bool> callback)
    {
        if (stream == null)
            return;

        if (login)
            loginCallback = callback;
        else
            registerCallback = callback;

        List<byte> b = new List<byte>();
        WriteInt(b, login ? (int)ServerType.LOGIN : (int)ServerType.REGISTER);
        WriteString(b, username);
        WriteString(b, GetHashSha256(password));
        stream.Write(b.ToArray(), 0, b.Count);
    }

    #region Read
    int ReadInt(byte[] bytes, ref int offset)
    {
        int data = 0;
        try
        {
            data = System.BitConverter.ToInt32(bytes, offset);
        }
        catch { }
        offset += 4;
        return data;
    }

    float ReadFloat(byte[] bytes, ref int offset)
    {
        float data = 0;
        try
        {
            data = System.BitConverter.ToSingle(bytes, offset);
        }
        catch { }
        offset += 4;
        return data;
    }

    string ReadString(byte[] bytes, ref int offset)
    {
        int length = ReadInt(bytes, ref offset);
        string data = "";
        try
        {
            data = Encoding.UTF8.GetString(bytes, offset, length);
        }
        catch { }
        offset += length;
        return data;
    }
    #endregion

    #region Write
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
    #endregion

    string GetHashSha256(string text)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(text);
        SHA256Managed hashstring = new SHA256Managed();
        byte[] hash = hashstring.ComputeHash(bytes);
        string hashString = string.Empty;
        foreach (byte b in hash)
            hashString += string.Format("{0:x2}", b);

        return hashString;
    }
}
