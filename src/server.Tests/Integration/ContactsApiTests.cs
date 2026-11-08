using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using PhoneBook.Application.Contacts;
using PhoneBook.Application.Groups;

namespace PhoneBook.Tests.Integration;

public class ContactsApiTests : IClassFixture<PhoneBookApiFactory>
{
    private readonly PhoneBookApiFactory _factory;

    public ContactsApiTests(PhoneBookApiFactory factory) => _factory = factory;

    private static object Input(string first, string? last = null, string number = "0300 1234567", bool favourite = false,
        int[]? groupIds = null, string? company = null, string? email = null) => new
    {
        firstName = first,
        lastName = last,
        company,
        email,
        notes = (string?)null,
        isFavourite = favourite,
        phones = new[] { new { label = "Mobile", number } },
        groupIds = groupIds ?? Array.Empty<int>(),
    };

    private static async Task<ContactDetail> CreateAsync(HttpClient client, object input)
    {
        var response = await client.PostAsJsonAsync("/api/contacts", input);
        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<ContactDetail>())!;
    }

    private static async Task<Paged<ContactSummary>> SearchAsync(HttpClient client, string query = "") =>
        (await client.GetFromJsonAsync<Paged<ContactSummary>>("/api/contacts" + query))!;

    private static MultipartFormDataContent VcfUpload(string vcf)
    {
        var file = new ByteArrayContent(Encoding.UTF8.GetBytes(vcf));
        file.Headers.ContentType = new MediaTypeHeaderValue("text/vcard");
        return new MultipartFormDataContent { { file, "file", "contacts.vcf" } };
    }

    // -----------------------------------------------------------------------------------------------------------

    [Fact]
    public async Task Contacts_crud_round_trip()
    {
        var client = await _factory.CreateUserClientAsync();

        // Create
        var created = await CreateAsync(client, new
        {
            firstName = "Imran",
            lastName = "Khan",
            company = "Acme",
            email = "imran@example.com",
            notes = "Cricket fan",
            isFavourite = false,
            phones = new[] { new { label = "Mobile", number = "0300 1234567" }, new { label = "Work", number = "021-111-222" } },
            groupIds = Array.Empty<int>(),
        });
        created.Id.Should().BePositive();
        created.DisplayName.Should().Be("Imran Khan");
        created.PrimaryPhone.Should().Be("0300 1234567");
        created.Phones.Select(p => (p.Label, p.Number)).Should().Equal(("Mobile", "0300 1234567"), ("Work", "021-111-222"));

        // Read
        var fetched = await client.GetFromJsonAsync<ContactDetail>($"/api/contacts/{created.Id}");
        fetched!.Notes.Should().Be("Cricket fan");
        fetched.Email.Should().Be("imran@example.com");

        // Update: phones and groups are replaced as a set
        var group = await (await client.PostAsJsonAsync("/api/groups", new { name = "Family" })).Content.ReadFromJsonAsync<GroupDto>();
        var update = await client.PutAsJsonAsync($"/api/contacts/{created.Id}", new
        {
            firstName = "Imran",
            lastName = "Ahmed",
            company = (string?)null,
            email = (string?)null,
            notes = (string?)null,
            isFavourite = true,
            phones = new[] { new { label = "Home", number = "042 7654321" } },
            groupIds = new[] { group!.Id },
        });
        update.StatusCode.Should().Be(HttpStatusCode.OK, await update.Content.ReadAsStringAsync());
        var updated = await update.Content.ReadFromJsonAsync<ContactDetail>();
        updated!.LastName.Should().Be("Ahmed");
        updated.Company.Should().BeNull();
        updated.IsFavourite.Should().BeTrue();
        updated.Phones.Should().ContainSingle().Which.Number.Should().Be("042 7654321");
        updated.Groups.Should().ContainSingle().Which.Name.Should().Be("Family");
        updated.UpdatedAt.Should().BeOnOrAfter(created.UpdatedAt);

        // Favourite toggle
        var fav = await client.PutAsJsonAsync($"/api/contacts/{created.Id}/favourite", new { isFavourite = false });
        (await fav.Content.ReadFromJsonAsync<ContactDetail>())!.IsFavourite.Should().BeFalse();

        // Delete
        (await client.DeleteAsync($"/api/contacts/{created.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await client.GetAsync($"/api/contacts/{created.Id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);

        // The group survives with no members
        var groups = await client.GetFromJsonAsync<List<GroupDto>>("/api/groups");
        groups.Should().ContainSingle().Which.ContactCount.Should().Be(0);
    }

    [Fact]
    public async Task Create_without_a_phone_is_a_400_validation_problem()
    {
        var client = await _factory.CreateUserClientAsync();

        var response = await client.PostAsJsonAsync("/api/contacts", new { firstName = "NoPhone", phones = Array.Empty<object>(), groupIds = Array.Empty<int>() });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("errors").TryGetProperty("Phones", out _).Should().BeTrue();
    }

    [Fact]
    public async Task A_user_cannot_see_or_change_another_users_contact()
    {
        var alice = await _factory.CreateUserClientAsync();
        var bob = await _factory.CreateUserClientAsync();
        var secret = await CreateAsync(alice, Input("Secret", "Contact"));

        (await bob.GetAsync($"/api/contacts/{secret.Id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await bob.PutAsJsonAsync($"/api/contacts/{secret.Id}", Input("Hacked"))).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await bob.PutAsJsonAsync($"/api/contacts/{secret.Id}/favourite", new { isFavourite = true })).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await bob.GetAsync($"/api/contacts/{secret.Id}/vcard")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await bob.DeleteAsync($"/api/contacts/{secret.Id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await SearchAsync(bob)).Total.Should().Be(0);

        (await alice.GetAsync($"/api/contacts/{secret.Id}")).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Contact_cannot_join_another_users_group()
    {
        var alice = await _factory.CreateUserClientAsync();
        var bob = await _factory.CreateUserClientAsync();
        var bobsGroup = await (await bob.PostAsJsonAsync("/api/groups", new { name = "Bob's" })).Content.ReadFromJsonAsync<GroupDto>();

        var response = await alice.PostAsJsonAsync("/api/contacts", Input("Sneaky", groupIds: new[] { bobsGroup!.Id }));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("errors").TryGetProperty("GroupIds", out _).Should().BeTrue();
    }

    [Fact]
    public async Task Search_matches_partial_phone_digits_regardless_of_formatting()
    {
        var client = await _factory.CreateUserClientAsync();
        var target = await CreateAsync(client, Input("Phone", "Match", number: "0300-123 4567"));
        await CreateAsync(client, Input("Other", "Person", number: "0412 999888"));

        var result = await SearchAsync(client, "?q=" + Uri.EscapeDataString("123 45"));

        result.Total.Should().Be(1);
        result.Items.Should().ContainSingle().Which.Id.Should().Be(target.Id);
    }

    [Fact]
    public async Task Search_with_local_trunk_prefix_finds_internationally_stored_number()
    {
        var client = await _factory.CreateUserClientAsync();
        var target = await CreateAsync(client, Input("Ahmed", "Khan", number: "+92 300 1234567"));
        await CreateAsync(client, Input("Other", "Person", number: "+92 412 999888"));

        var result = await SearchAsync(client, "?q=" + Uri.EscapeDataString("0300 123"));

        result.Total.Should().Be(1);
        result.Items.Should().ContainSingle().Which.Id.Should().Be(target.Id);
    }

    [Fact]
    public async Task Search_matches_name_company_and_email_case_insensitively()
    {
        var client = await _factory.CreateUserClientAsync();
        await CreateAsync(client, Input("Zara", "Sheikh", company: "Blue Water Ltd"));
        await CreateAsync(client, Input("Omar", "Farooq", email: "omar@BlueSky.example"));
        await CreateAsync(client, Input("Nobody", "Here"));

        (await SearchAsync(client, "?q=zAr")).Items.Select(c => c.FirstName).Should().Equal("Zara");
        (await SearchAsync(client, "?q=blue")).Items.Select(c => c.FirstName).Should().BeEquivalentTo("Zara", "Omar");
    }

    [Fact]
    public async Task Favourites_filter_returns_only_favourites()
    {
        var client = await _factory.CreateUserClientAsync();
        var fav = await CreateAsync(client, Input("Fav", "One", favourite: true));
        await CreateAsync(client, Input("Plain", "Two"));

        var result = await SearchAsync(client, "?favourites=true");

        result.Items.Should().ContainSingle().Which.Id.Should().Be(fav.Id);
        (await SearchAsync(client, "?favourites=false")).Total.Should().Be(2);
    }

    [Fact]
    public async Task Group_filter_returns_only_members_and_counts_them()
    {
        var client = await _factory.CreateUserClientAsync();
        var work = await (await client.PostAsJsonAsync("/api/groups", new { name = "Work" })).Content.ReadFromJsonAsync<GroupDto>();
        var member = await CreateAsync(client, Input("In", "Group", groupIds: new[] { work!.Id }));
        await CreateAsync(client, Input("Not", "Member"));

        var result = await SearchAsync(client, $"?groupId={work.Id}");

        result.Items.Should().ContainSingle().Which.Id.Should().Be(member.Id);
        result.Items[0].Groups.Should().ContainSingle().Which.Name.Should().Be("Work");
        var groups = await client.GetFromJsonAsync<List<GroupDto>>("/api/groups");
        groups.Should().ContainSingle(g => g.Id == work.Id).Which.ContactCount.Should().Be(1);
    }

    [Fact]
    public async Task Duplicate_group_name_is_409_and_deleting_a_group_keeps_its_contacts()
    {
        var client = await _factory.CreateUserClientAsync();
        var friends = await (await client.PostAsJsonAsync("/api/groups", new { name = "Friends" })).Content.ReadFromJsonAsync<GroupDto>();
        (await client.PostAsJsonAsync("/api/groups", new { name = "friends" })).StatusCode.Should().Be(HttpStatusCode.Conflict);

        var renamed = await client.PutAsJsonAsync($"/api/groups/{friends!.Id}", new { name = "Close friends" });
        renamed.StatusCode.Should().Be(HttpStatusCode.OK);
        var contact = await CreateAsync(client, Input("Kept", groupIds: new[] { friends.Id }));

        (await client.DeleteAsync($"/api/groups/{friends.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);

        var after = await client.GetFromJsonAsync<ContactDetail>($"/api/contacts/{contact.Id}");
        after!.Groups.Should().BeEmpty();
    }

    [Fact]
    public async Task Sort_by_name_and_by_recent()
    {
        var client = await _factory.CreateUserClientAsync();
        var a = await CreateAsync(client, Input("Ali", "Zaidi"));
        var b = await CreateAsync(client, Input("Bushra", "Ahmed"));
        var c = await CreateAsync(client, Input("Cyrus")); // no last name -> last when sorting by name

        (await SearchAsync(client, "?sort=name")).Items.Select(x => x.Id).Should().Equal(b.Id, a.Id, c.Id);

        await Task.Delay(20);
        (await client.PutAsJsonAsync($"/api/contacts/{a.Id}/favourite", new { isFavourite = true })).EnsureSuccessStatusCode();

        var recent = await SearchAsync(client, "?sort=recent");
        recent.Items.Select(x => x.Id).Should().Equal(a.Id, c.Id, b.Id);
    }

    [Fact]
    public async Task Search_pages_results()
    {
        var client = await _factory.CreateUserClientAsync();
        for (var i = 0; i < 5; i++) await CreateAsync(client, Input($"Person{i}", "Paged", number: $"0300 000000{i}"));

        var page2 = await SearchAsync(client, "?page=2&pageSize=2");

        page2.Total.Should().Be(5);
        page2.Page.Should().Be(2);
        page2.PageSize.Should().Be(2);
        page2.TotalPages.Should().Be(3);
        page2.Items.Should().HaveCount(2);
    }

    [Fact]
    public async Task Export_returns_a_vcard_file()
    {
        var client = await _factory.CreateUserClientAsync();
        await CreateAsync(client, Input("Export", "Me"));
        var one = await CreateAsync(client, Input("Also", "Me"));

        var response = await client.GetAsync("/api/contacts/export");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.Should().Be("text/vcard");
        response.Content.Headers.ContentDisposition!.FileName.Should().Contain("contacts.vcf");
        var body = await response.Content.ReadAsStringAsync();
        body.Should().StartWith("BEGIN:VCARD");
        body.Split("BEGIN:VCARD").Length.Should().Be(3);
        body.Should().Contain("FN:Export Me");

        var single = await client.GetAsync($"/api/contacts/{one.Id}/vcard");
        single.Content.Headers.ContentDisposition!.FileName.Should().Contain("also-me.vcf");
        (await single.Content.ReadAsStringAsync()).Should().Contain("N:Me;Also;;;");
    }

    [Fact]
    public async Task Import_is_all_or_nothing_when_a_card_is_invalid()
    {
        var client = await _factory.CreateUserClientAsync();
        const string vcf =
            "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Valid;First;;;\r\nTEL;TYPE=CELL:0300 1111111\r\nEND:VCARD\r\n" +
            "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Broken;Second;;;\r\nTEL;TYPE=CELL:12\r\nEND:VCARD\r\n" +
            "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Valid;Third;;;\r\nTEL;TYPE=WORK:021 3333333\r\nEND:VCARD\r\n";

        var response = await client.PostAsync("/api/contacts/import", VcfUpload(vcf));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        var errors = problem.GetProperty("errors").GetProperty("File").EnumerateArray().Select(e => e.GetString()).ToList();
        errors.Should().ContainSingle().Which.Should().StartWith("Card 2");
        (await SearchAsync(client)).Total.Should().Be(0);
    }

    [Fact]
    public async Task Import_of_a_valid_file_reports_counts()
    {
        var client = await _factory.CreateUserClientAsync();
        const string vcf =
            "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Malik;Hina;;;\r\nTEL;TYPE=CELL:0300 1111111\r\nEMAIL:hina@example.com\r\nEND:VCARD\r\n" +
            "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Tariq Jameel\r\nitem1.TEL:+92 321 2222222\r\nTEL;TYPE=HOME:042 3333333\r\nEND:VCARD\r\n" +
            "BEGIN:VCARD\r\nVERSION:3.0\r\nNOTE:no name and no phone\r\nEND:VCARD\r\n";

        var response = await client.PostAsync("/api/contacts/import", VcfUpload(vcf));

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var result = await response.Content.ReadFromJsonAsync<ImportResult>();
        result!.Imported.Should().Be(2);
        result.Skipped.Should().Be(1);
        result.Errors.Should().BeEmpty();

        var all = await SearchAsync(client, "?sort=name");
        all.Items.Select(c => c.DisplayName).Should().Equal("Tariq Jameel", "Hina Malik");
        (await SearchAsync(client, "?q=2222")).Items.Should().ContainSingle().Which.FirstName.Should().Be("Tariq");
    }

    [Fact]
    public async Task Import_without_a_file_is_400()
    {
        var client = await _factory.CreateUserClientAsync();

        var response = await client.PostAsync("/api/contacts/import", new MultipartFormDataContent { { new StringContent("x"), "other" } });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
