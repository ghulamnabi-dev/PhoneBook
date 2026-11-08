using System.Text;
using PhoneBook.Domain;

namespace PhoneBook.Application.VCard;

/// <summary>A parsed vCard, independent of persistence.</summary>
public sealed record VCardEntry(string FirstName, string? LastName, string? Company, string? Email, string? Notes, IReadOnlyList<(PhoneLabel Label, string Number)> Phones);

/// <summary>
/// Minimal, dependency-free vCard 3.0 reader/writer (RFC 2426) covering what phones and Google Contacts export:
/// N, FN, ORG, EMAIL, TEL (with TYPE), NOTE; line folding; escaped commas/semicolons/newlines.
/// </summary>
public static class VCardSerializer
{
    public static string Serialize(Contact c)
    {
        var sb = new StringBuilder();
        sb.Append("BEGIN:VCARD\r\nVERSION:3.0\r\n");
        sb.Append("N:").Append(Escape(c.LastName ?? "")).Append(';').Append(Escape(c.FirstName)).Append(";;;\r\n");
        sb.Append("FN:").Append(Escape(c.DisplayName)).Append("\r\n");
        if (!string.IsNullOrWhiteSpace(c.Company)) sb.Append("ORG:").Append(Escape(c.Company)).Append("\r\n");
        foreach (var p in c.Phones.OrderBy(p => p.SortOrder))
            sb.Append("TEL;TYPE=").Append(TelType(p.Label)).Append(':').Append(p.Number).Append("\r\n");
        if (!string.IsNullOrWhiteSpace(c.Email)) sb.Append("EMAIL;TYPE=INTERNET:").Append(c.Email).Append("\r\n");
        if (!string.IsNullOrWhiteSpace(c.Notes)) sb.Append("NOTE:").Append(Escape(c.Notes)).Append("\r\n");
        sb.Append("REV:").Append(c.UpdatedAt.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'")).Append("\r\n");
        sb.Append("END:VCARD\r\n");
        return sb.ToString();
    }

    public static string Serialize(IEnumerable<Contact> contacts) => string.Concat(contacts.Select(Serialize));

    public static IReadOnlyList<VCardEntry> Parse(string text)
    {
        var entries = new List<VCardEntry>();
        string? first = null, last = null, fn = null, org = null, email = null, note = null;
        var phones = new List<(PhoneLabel, string)>();
        var inCard = false;

        foreach (var raw in Unfold(text))
        {
            var line = raw.TrimEnd('\r');
            if (line.Length == 0) continue;

            if (line.Equals("BEGIN:VCARD", StringComparison.OrdinalIgnoreCase))
            {
                inCard = true; first = last = fn = org = email = note = null; phones = new();
                continue;
            }
            if (line.Equals("END:VCARD", StringComparison.OrdinalIgnoreCase))
            {
                if (inCard)
                {
                    var (f, l) = ResolveName(first, last, fn, org);
                    entries.Add(new VCardEntry(f, l, org, email, note, phones));
                }
                inCard = false;
                continue;
            }
            if (!inCard) continue;

            var colon = line.IndexOf(':');
            if (colon <= 0) continue;
            var head = line[..colon];
            var value = line[(colon + 1)..];
            var parts = head.Split(';');
            var name = parts[0].ToUpperInvariant();
            if (name.Contains('.')) name = name[(name.IndexOf('.') + 1)..]; // group prefix e.g. item1.TEL
            var parameters = parts.Skip(1).Select(p => p.ToUpperInvariant()).ToList();

            switch (name)
            {
                case "N":
                    var n = SplitUnescaped(value, ';');
                    last = n.ElementAtOrDefault(0)?.Trim();
                    first = n.ElementAtOrDefault(1)?.Trim();
                    break;
                case "FN": fn = Unescape(value).Trim(); break;
                case "ORG": org = Unescape(SplitUnescaped(value, ';').FirstOrDefault() ?? "").Trim(); break;
                case "EMAIL": email ??= Unescape(value).Trim(); break;
                case "NOTE": note = Unescape(value); break;
                case "TEL":
                    var number = Unescape(value).Trim();
                    if (number.StartsWith("tel:", StringComparison.OrdinalIgnoreCase)) number = number[4..];
                    if (number.Length > 0) phones.Add((LabelFrom(parameters), number));
                    break;
            }
        }
        return entries;
    }

    private static (string First, string? Last) ResolveName(string? first, string? last, string? fn, string? org)
    {
        if (!string.IsNullOrWhiteSpace(first)) return (first!, string.IsNullOrWhiteSpace(last) ? null : last);
        if (!string.IsNullOrWhiteSpace(last)) return (last!, null);
        if (!string.IsNullOrWhiteSpace(fn))
        {
            var idx = fn!.LastIndexOf(' ');
            return idx > 0 ? (fn[..idx], fn[(idx + 1)..]) : (fn, null);
        }
        return (org ?? string.Empty, null);
    }

    private static PhoneLabel LabelFrom(List<string> parameters)
    {
        var types = parameters.SelectMany(p => p.StartsWith("TYPE=") ? p[5..].Split(',') : new[] { p }).ToHashSet();
        if (types.Contains("CELL") || types.Contains("MOBILE")) return PhoneLabel.Mobile;
        if (types.Contains("WORK")) return PhoneLabel.Work;
        if (types.Contains("HOME")) return PhoneLabel.Home;
        return types.Count == 0 ? PhoneLabel.Mobile : PhoneLabel.Other;
    }

    private static string TelType(PhoneLabel label) => label switch
    {
        PhoneLabel.Mobile => "CELL",
        PhoneLabel.Home => "HOME",
        PhoneLabel.Work => "WORK",
        _ => "OTHER",
    };

    /// <summary>RFC 2425 line unfolding: a line starting with a space or tab continues the previous one.</summary>
    private static IEnumerable<string> Unfold(string text)
    {
        string? current = null;
        foreach (var line in text.Replace("\r\n", "\n").Split('\n'))
        {
            if (line.Length > 0 && (line[0] == ' ' || line[0] == '\t') && current != null) { current += line[1..]; continue; }
            if (current != null) yield return current;
            current = line;
        }
        if (current != null) yield return current;
    }

    private static List<string> SplitUnescaped(string value, char sep)
    {
        var result = new List<string>(); var sb = new StringBuilder();
        for (var i = 0; i < value.Length; i++)
        {
            if (value[i] == '\\' && i + 1 < value.Length) { sb.Append(value[i]).Append(value[++i]); continue; }
            if (value[i] == sep) { result.Add(Unescape(sb.ToString())); sb.Clear(); continue; }
            sb.Append(value[i]);
        }
        result.Add(Unescape(sb.ToString()));
        return result;
    }

    private static string Escape(string s) => s.Replace("\\", "\\\\").Replace(";", "\\;").Replace(",", "\\,").Replace("\r\n", "\\n").Replace("\n", "\\n");
    private static string Unescape(string s) => s.Replace("\\n", "\n").Replace("\\N", "\n").Replace("\\,", ",").Replace("\\;", ";").Replace("\\\\", "\\");
}
