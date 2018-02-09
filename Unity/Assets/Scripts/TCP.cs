﻿using UnityEngine;
using System;
using System.Net.Sockets;
using System.Text;
using System.Collections.Generic;
using System.Security.Cryptography;

public class TCP : MonoBehaviour
{
    private enum ServerType { LOGIN, REGISTER, CREATE_GAME, REQUEST_GAMES, JOIN_RESUME_GAME, MOVE, SURRENDER };
    private enum ClientType { LOGIN_RESULT, GAME_CREATED, GAME_LIST, GAME_STATE, MOVE_RESULT, GAME_UPDATE };

    private TcpClient client = new TcpClient();
    private NetworkStream stream;

    private event Action<bool> loginCallback;
    private event Action<bool> registerCallback;
    private event Action<string> createGameCallback;
    private event Action<Game.GameData> joinResumeCallback;
    private event Action<string[]> requestGamesCallback;
    private event Action<string> gameUpdateCallback;

    void Start()
    {
        try
        {
            client.Connect("192.168.0.245", 5000);
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
            print("Incoming MsgType: " + messageType);

            switch (messageType)
            {
                case ClientType.LOGIN_RESULT:
                    bool result = ReadBool(bytes, ref offset);
                    if (!result)
                        Toast.ShowMessage(ReadString(bytes, ref offset));

                    if (registerCallback != null)
                        registerCallback.Invoke(result);
                    else if (loginCallback != null)
                        loginCallback.Invoke(result);

                    break;

                case ClientType.GAME_CREATED:
                    result = ReadBool(bytes, ref offset);
                    string gameId = null;

                    if (result)
                        gameId = ReadString(bytes, ref offset);
                    else
                        Toast.ShowMessage(ReadString(bytes, ref offset));

                    if (createGameCallback != null)
                        createGameCallback.Invoke(gameId.Length == 5 ? gameId : null);

                    break;

                case ClientType.GAME_LIST:
                    result = ReadBool(bytes, ref offset);
                    string[] list = null;

                    if (result)
                    {
                        string games = ReadString(bytes, ref offset);
                        if (!string.IsNullOrEmpty(games))
                            list = games.Split(',');
                    }
                    else
                        Toast.ShowMessage(ReadString(bytes, ref offset));

                    if (requestGamesCallback != null)
                        requestGamesCallback.Invoke(list);

                    break;

                case ClientType.GAME_STATE:
                    result = ReadBool(bytes, ref offset);
                    if (result)
                    {
                        string boardString = ReadString(bytes, ref offset);
                        if (boardString.Length == 99)
                        {
                            string[] tiles = boardString.Split(',');
                            GameLogic.Tile[] board = new GameLogic.Tile[50];
                            for (int i = 0; i < 50; i++)
                                board[i] = (GameLogic.Tile)Convert.ToInt32(tiles[i]);

                            int turn = ReadInt(bytes, ref offset);
                            string blue = ReadString(bytes, ref offset);
                            string white = ReadString(bytes, ref offset);
                            int winner = ReadInt(bytes, ref offset);
                            if (joinResumeCallback != null)
                                joinResumeCallback.Invoke(new Game.GameData(board, turn, blue, white, winner));
                        }
                        else if (joinResumeCallback != null)
                            joinResumeCallback.Invoke(new Game.GameData());
                    }
                    else
                    {
                        Toast.ShowMessage(ReadString(bytes, ref offset));
                        if (joinResumeCallback != null)
                            joinResumeCallback.Invoke(new Game.GameData());
                    }

                    break;

                case ClientType.MOVE_RESULT:
                    result = ReadBool(bytes, ref offset);
                    if (result)
                    {
                        Toast.ShowMessage("Move was successful");
                        int winner = ReadInt(bytes, ref offset);
                        if (winner != -1)
                            Toast.ShowMessage("Winner Winner Chicken Dinner");
                    }
                    else
                        Toast.ShowMessage(ReadString(bytes, ref offset));
                    break;

                case ClientType.GAME_UPDATE:
                    gameId = ReadString(bytes, ref offset);
                    if (!string.IsNullOrEmpty(gameId) && gameUpdateCallback != null)
                        gameUpdateCallback.Invoke(gameId);
                    break;
            }
        }
    }

    public void SubscribeGameUpdate(Action<string> callback)
    {
        gameUpdateCallback = callback;
    }

    public void LoginRegister(bool login, string username, string password, Action<bool> callback)
    {
        if (stream == null || username.Length == 0 || password.Length == 0)
        {
            callback(false);
            return;
        }

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

    public void CreateGame(int colour, Action<string> callback)
    {
        createGameCallback = callback;
        List<byte> b = new List<byte>();
        WriteInt(b, (int)ServerType.CREATE_GAME);
        WriteInt(b, colour);
        stream.Write(b.ToArray(), 0, b.Count);
    }

    public void JoinResumeGame(string gameId, Action<Game.GameData> callback)
    {
        joinResumeCallback = callback;
        List<byte> b = new List<byte>();
        WriteInt(b, (int)ServerType.JOIN_RESUME_GAME);
        WriteString(b, gameId);
        stream.Write(b.ToArray(), 0, b.Count);
    }

    public void RequestGames(Action<string[]> callback)
    {
        requestGamesCallback = callback;
        List<byte> b = new List<byte>();
        WriteInt(b, (int)ServerType.REQUEST_GAMES);
        stream.Write(b.ToArray(), 0, b.Count);
    }

    public void Move(int tile, int[] moves)
    {
        List<byte> b = new List<byte>();
        WriteInt(b, (int)ServerType.MOVE);
        WriteInt(b, tile);
        WriteInt(b, moves.Length);
        for (int i = 0; i < moves.Length; i++)
            WriteInt(b, moves[i]);

        stream.Write(b.ToArray(), 0, b.Count);
    }

    #region Read
    int ReadInt(byte[] bytes, ref int offset)
    {
        int data = 0;
        try
        {
            data = BitConverter.ToInt32(bytes, offset);
        }
        catch { }
        offset += 4;
        return data;
    }

    bool ReadBool(byte[] bytes, ref int offset)
    {
        bool data = false;
        try
        {
            byte b = bytes[offset];
            if (b == 1)
                data = true;
        }
        catch { }
        offset++;
        return data;
    }

    float ReadFloat(byte[] bytes, ref int offset)
    {
        float data = 0;
        try
        {
            data = BitConverter.ToSingle(bytes, offset);
        }
        catch { }
        offset += 4;
        return data;
    }

    string ReadString(byte[] bytes, ref int offset)
    {
        int length = ReadInt(bytes, ref offset);
        string data = "";
        if (length == 0)
            return null;

        try
        {
            data = Encoding.ASCII.GetString(bytes, offset, length);
        }
        catch { }
        offset += length;
        return data;
    }
    #endregion

    #region Write
    void WriteInt(List<byte> bytes, int data)
    {
        foreach (byte b in BitConverter.GetBytes(data))
            bytes.Add(b);
    }

    void WriteFloat(List<byte> bytes, float data)
    {
        foreach (byte b in BitConverter.GetBytes(data))
            bytes.Add(b);
    }

    void WriteString(List<byte> bytes, string data)
    {
        WriteInt(bytes, data.Length);
        foreach (byte b in Encoding.ASCII.GetBytes(data))
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
