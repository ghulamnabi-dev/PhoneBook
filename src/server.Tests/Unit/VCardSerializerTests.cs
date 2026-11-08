using PhoneBook.Application.VCard;
using PhoneBook.Domain;

namespace PhoneBook.Tests.Unit;

public class VCardSerializerTests
{
    [Fact]
    public void Serialize_then_parse_round_trips_every_field()
    {
        var contact = new Contact
        {
            FirstName = "Ayesha",
            LastName = "O'Brien",
            Company = "Acme, Inc; Karachi",
            Email = "ayesha@example.com",
            Notes = "Met at the expo.\nPrefers WhatsApp, not calls.",
            UpdatedAt = new DateTime(2025, 2, 1, 10, 30, 0, DateTimeKind.Utc),
            Phones =
            {
                new PhoneNumber { Label = PhoneLabel.Mobile, Number = "+92 300 1234567", SortOrder = 0 },
                new PhoneNumber { Label = PhoneLabel.Work, Number = "021-111-222-333", SortOrder = 1 },
                new PhoneNumber { Label = PhoneLabel.Home, Number = "021 3456789", SortOrder = 2 },
                new PhoneNumber { Label = PhoneLabel.Other, Number = "0800 12345", SortOrder = 3 },
            },
        };

        var text = VCardSerializer.Serialize(contact);
        var parsed = VCardSerializer.Parse(text);

        text.Should().StartWith("BEGIN:VCARD\r\nVERSION:3.0\r\n").And.EndWith("END:VCARD\r\n");
        parsed.Should().ContainSingle();
        var e = parsed[0];
        e.FirstName.Should().Be("Ayesha");
        e.LastName.Should().Be("O'Brien");
        e.Company.Should().Be("Acme, Inc; Karachi");
        e.Email.Should().Be("ayesha@example.com");
        e.Notes.Should().Be("Met at the expo.\nPrefers WhatsApp, not calls.");
        e.Phones.Should().Equal(
            (PhoneLabel.Mobile, "+92 300 1234567"),
            (PhoneLabel.Work, "021-111-222-333"),
            (PhoneLabel.Home, "021 3456789"),
            (PhoneLabel.Other, "0800 12345"));
    }

    [Fact]
    public void Serialize_many_writes_one_card_per_contact()
    {
        var contacts = new[] { new Contact { FirstName = "A" }, new Contact { FirstName = "B" }, new Contact { FirstName = "C" } };

        var text = VCardSerializer.Serialize(contacts);

        VCardSerializer.Parse(text).Select(e => e.FirstName).Should().Equal("A", "B", "C");
    }

    [Fact]
    public void Parse_unfolds_continuation_lines()
    {
        const string text = "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Khan;Imran;;;\r\nNOTE:This note was fol\r\n ded across\r\n\t two lines\r\nEND:VCARD\r\n";

        var e = VCardSerializer.Parse(text).Single();

        e.Notes.Should().Be("This note was folded across two lines");
    }

    [Fact]
    public void Parse_unescapes_commas_semicolons_and_newlines()
    {
        const string text = "BEGIN:VCARD\nN:Smith\\, Jr;John;;;\nORG:Smith\\, Jones & Co\nNOTE:one\\ntwo\\; three\nEND:VCARD\n";

        var e = VCardSerializer.Parse(text).Single();

        e.LastName.Should().Be("Smith, Jr");
        e.FirstName.Should().Be("John");
        e.Company.Should().Be("Smith, Jones & Co");
        e.Notes.Should().Be("one\ntwo; three");
    }

    [Fact]
    public void Parse_maps_tel_types_and_ignores_group_prefixes()
    {
        const string text = """
            BEGIN:VCARD
            VERSION:3.0
            FN:Sara Ahmed
            TEL;TYPE=CELL:0300 1111111
            TEL;TYPE=WORK,VOICE:021 2222222
            TEL;type=HOME:021 3333333
            item1.TEL;TYPE=pref:+92 321 4444444
            item1.X-ABLabel:Other
            TEL;CELL:0300 5555555
            TEL;TYPE=FAX:021 6666666
            item2.EMAIL;TYPE=INTERNET:sara@example.com
            END:VCARD
            """;

        var e = VCardSerializer.Parse(text).Single();

        e.Phones.Should().Equal(
            (PhoneLabel.Mobile, "0300 1111111"),
            (PhoneLabel.Work, "021 2222222"),
            (PhoneLabel.Home, "021 3333333"),
            (PhoneLabel.Other, "+92 321 4444444"),
            (PhoneLabel.Mobile, "0300 5555555"),
            (PhoneLabel.Other, "021 6666666"));
        e.Email.Should().Be("sara@example.com");
    }

    [Fact]
    public void Parse_splits_FN_when_there_is_no_N()
    {
        const string text = "BEGIN:VCARD\nFN:Muhammad Ali Jinnah\nTEL:0300 1234567\nEND:VCARD\nBEGIN:VCARD\nFN:Cher\nEND:VCARD\n";

        var entries = VCardSerializer.Parse(text);

        entries.Should().HaveCount(2);
        entries[0].FirstName.Should().Be("Muhammad Ali");
        entries[0].LastName.Should().Be("Jinnah");
        entries[0].Phones.Should().ContainSingle().Which.Should().Be((PhoneLabel.Mobile, "0300 1234567"));
        entries[1].FirstName.Should().Be("Cher");
        entries[1].LastName.Should().BeNull();
    }

    [Fact]
    public void Parse_skips_garbage_outside_and_inside_cards()
    {
        const string text = """
            this is not a vcard
            END:VCARD
            TEL:0300 0000000
            BEGIN:VCARD
            just some junk without a colon
            N:Raza;Ali;;;
            X-UNKNOWN;FOO=bar:ignored
            END:VCARD
            trailing nonsense
            """;

        var entries = VCardSerializer.Parse(text);

        entries.Should().ContainSingle();
        entries[0].FirstName.Should().Be("Ali");
        entries[0].LastName.Should().Be("Raza");
        entries[0].Phones.Should().BeEmpty();
    }

    [Fact]
    public void Parse_of_empty_or_non_vcard_text_returns_nothing()
    {
        VCardSerializer.Parse("").Should().BeEmpty();
        VCardSerializer.Parse("hello\nworld").Should().BeEmpty();
    }
}
