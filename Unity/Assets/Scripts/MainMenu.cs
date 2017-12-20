using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class MainMenu : MonoBehaviour
{
    public TCP tcp;
    public InputField userField;
    public InputField passwordField;

    public void Register()
    {
        tcp.Register(userField.text, passwordField.text);
    }
}
