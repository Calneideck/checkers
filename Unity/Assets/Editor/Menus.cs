﻿using UnityEngine;
using UnityEditor;

public class Menus : MonoBehaviour
{
    private const float size = 0.5f;
    private static Vector2 pos = new Vector2(-1.25f, 1.75f);
    private static int offset = 0;

    [MenuItem("Custom Menu/Align")]
    static void DoSomething()
    {
        if (Selection.activeTransform == null)
            return;

        for (int i = 0; i < Selection.activeTransform.childCount; i++)
        {
            Selection.activeTransform.GetChild(i).position = pos;
            pos += Vector2.right * size * 2;

            if ((i + 1) % 4 == 0 && i > 0)
            {
                pos += Vector2.down * size;
                pos.x = -1.75f + offset * size;
                offset = 1 - offset;
            }
        }
    }
}
