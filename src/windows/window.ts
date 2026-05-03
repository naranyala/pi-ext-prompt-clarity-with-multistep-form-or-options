/**
 * WindowService provides window management via Win32 APIs.
 * Supports enumeration, focus management, and window position control.
 */
import type { ShellService } from "../core/shell-service";

export interface WindowInfo {
  title: string;
  handle: string;
  process: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  minimized: boolean;
}

export class WindowService {
  constructor(private readonly shell: ShellService) {}

  async list(): Promise<WindowInfo[]> {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
public class WindowEnumerator {
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")] static extern int GetWindowTextLength(IntPtr hWnd);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdProcessId);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  delegate bool EnumWindowsProc(IntPtr hWnd);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  public static string GetWindows() {
    var wins = new List<string>();
    EnumWindows((hWnd) => {
      if (IsWindowVisible(hWnd) && GetWindowTextLength(hWnd) > 0) {
        var len = GetWindowTextLength(hWnd) + 1;
        var sb = new StringBuilder(len);
        GetWindowText(hWnd, sb, len);
        uint pid; GetWindowThreadProcessId(hWnd, out pid);
        RECT r; GetWindowRect(hWnd, out r);
        wins.Add(sb.ToString() + "|" + hWnd + "|" + pid + "|" + r.Left + "," + r.Top + "," + (r.Right-r.Left) + "," + (r.Bottom-r.Top) + "|" + IsWindowVisible(hWnd) + "|" + IsIconic(hWnd));
      }
      return true;
    }, IntPtr.Zero);
    return string.Join("\\n", wins);
  }
}
"@
[WindowEnumerator]::GetWindows()
`;
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      script.replace(/\n/g, " ")
    ], true);

    if (!result.success) return [];

    return result.stdout.trim().split("\n")
      .filter(line => line.includes("|"))
      .map(line => {
        const parts = line.split("|");
        const coords = parts[3].split(",");
        return {
          title: parts[0],
          handle: parts[1],
          process: parts[2],
          x: parseInt(coords[0], 10),
          y: parseInt(coords[1], 10),
          width: parseInt(coords[2], 10),
          height: parseInt(coords[3], 10),
          visible: parts[4] === "True",
          minimized: parts[5] === "True"
        };
      })
      .filter((w: WindowInfo) => w.title && w.title !== "");
  }

  async findByTitle(title: string): Promise<WindowInfo[]> {
    const all = await this.list();
    return all.filter(w => w.title.toLowerCase().includes(title.toLowerCase()));
  }

  async findByProcess(processName: string): Promise<WindowInfo[]> {
    const all = await this.list();
    return all.filter(w => w.process.toLowerCase().includes(processName.toLowerCase()));
  }

  async focus(title: string): Promise<boolean> {
    const windows = await this.findByTitle(title);
    if (windows.length === 0) return false;

    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Add-Type @"
using System; using System.Runtime.InteropServices;
public class WinFocus {
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  public static bool Focus(string hWnd) {
    var h = new IntPtr(Convert.ToInt64(hWnd));
    return SetForegroundWindow(h) && ShowWindow(h, 9);
  }
}
"@
[WinFocus]::Focus('${windows[0].handle}')
`);
    return result.success;
  }

  async setPosition(title: string, x: number, y: number, width: number, height: number): Promise<boolean> {
    const windows = await this.findByTitle(title);
    if (windows.length === 0) return false;

    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Add-Type @"
using System; using System.Runtime.InteropServices;
public class WinPos {
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndAfter, int X, int Y, int cx, int cy, uint uFlags);
  public static bool Set(string hWnd, int x, int y, int w, int h) {
    return SetWindowPos(new IntPtr(Convert.ToInt64(hWnd)), IntPtr.Zero, x, y, w, h, 0x0040);
  }
}
"@
[WinPos]::Set('${windows[0].handle}', ${x}, ${y}, ${width}, ${height})
`);
    return result.success;
  }

  async minimize(title: string): Promise<boolean> {
    return this.showWindow(title, 6);
  }

  async maximize(title: string): Promise<boolean> {
    return this.showWindow(title, 3);
  }

  async restore(title: string): Promise<boolean> {
    return this.showWindow(title, 9);
  }

  async hide(title: string): Promise<boolean> {
    return this.showWindow(title, 0);
  }

  private async showWindow(title: string, cmd: number): Promise<boolean> {
    const windows = await this.findByTitle(title);
    if (windows.length === 0) return false;

    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Add-Type @"
using System; using System.Runtime.InteropServices;
public class WinShow {
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  public static bool Show(string hWnd, int cmd) {
    return ShowWindow(new IntPtr(Convert.ToInt64(hWnd)), cmd);
  }
}
"@
[WinShow]::Show('${windows[0].handle}', ${cmd})
`);
    return result.success;
  }
}