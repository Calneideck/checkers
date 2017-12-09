using UnityEngine;

public class Token : MonoBehaviour
{
    private int tileIndex;
    private bool king;

    public int Index
    {
        get { return tileIndex; }
        set { tileIndex = value; }
    }

    public bool King
    {
        get { return king; }
        set { king = value; }
    }
}