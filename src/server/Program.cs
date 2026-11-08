using System.Reflection;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PhoneBook.Api.Errors;
using PhoneBook.Application.Auth;
using PhoneBook.Application.Contacts;
using PhoneBook.Application.Groups;
using PhoneBook.Domain;
using PhoneBook.Infrastructure.Persistence;
using PhoneBook.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------------
// Configuration. Values are read lazily from the final configuration and validated right after Build(),
// so the app fails fast at startup — and test hosts can override them.
// ---------------------------------------------------------------------------
builder.Services.AddOptions<JwtSettings>().Bind(builder.Configuration.GetSection(JwtSettings.SectionName));

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() is { Length: > 0 } origins
    ? origins
    : new[] { "http://localhost:4300" };

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        // Model validation failures come back as RFC 7807 ValidationProblemDetails with per-field errors.
        options.InvalidModelStateResponseFactory = context =>
            new BadRequestObjectResult(new ValidationProblemDetails(context.ModelState)
            {
                Title = "One or more fields are invalid.",
                Status = StatusCodes.Status400BadRequest,
            });
    });
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<AppExceptionHandler>();

// SQLite by default (zero-setup dev); SQL Server when Database:Provider=SqlServer.
builder.Services.AddDbContext<PhoneBookDbContext>((sp, options) =>
{
    var db = DatabaseSettings.From(sp.GetRequiredService<IConfiguration>());
    if (db.IsSqlite) options.UseSqlite(db.ConnectionString);
    else options.UseSqlServer(db.ConnectionString);
});

// Repository + Unit of Work: services see only IUnitOfWork, never the DbContext.
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IContactService, ContactService>();
builder.Services.AddScoped<IGroupService, GroupService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .WithExposedHeaders("Content-Disposition")); // so the client can read the .vcf file name
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "PhoneBook API",
        Version = "v1",
        Description = "Personal contacts with groups, favourites, search and vCard import/export.",
    });

    var xml = Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetExecutingAssembly().GetName().Name}.xml");
    if (File.Exists(xml)) options.IncludeXmlComments(xml);

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
            },
            Array.Empty<string>()
        },
    });
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtSettings>, IHostEnvironment>((options, jwtOptions, env) =>
    {
        var jwt = jwtOptions.Value;
        options.RequireHttpsMetadata = !env.IsDevelopment();
        options.MapInboundClaims = false; // keep "sub", "email", "name" as issued
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
            ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = "name",
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddHealthChecks().AddDbContextCheck<PhoneBookDbContext>();

var app = builder.Build();

// ---------------------------------------------------------------------------
// Startup checks and schema
// ---------------------------------------------------------------------------
app.Services.GetRequiredService<IOptions<JwtSettings>>().Value.EnsureValid();

var database = DatabaseSettings.From(app.Configuration);
if (!database.IsInMemorySqlite) // in-memory databases (tests) create their own schema
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<PhoneBookDbContext>();
    if (database.IsSqlite)
    {
        db.Database.EnsureCreated();
    }
    else if (db.Database.GetMigrations().Any())
    {
        db.Database.Migrate();
    }
    else
    {
        app.Logger.LogWarning("No EF Core migrations found; creating the SQL Server schema with EnsureCreated(). " +
                              "Run `dotnet ef migrations add Initial` before relying on migrations.");
        db.Database.EnsureCreated();
    }
}

// ---------------------------------------------------------------------------
// Middleware pipeline (order matters)
// ---------------------------------------------------------------------------
app.UseExceptionHandler();   // Application exceptions -> 400/401/404/409 ProblemDetails; anything else -> 500
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "PhoneBook API v1");
        options.RoutePrefix = string.Empty; // Swagger UI at the site root in development
    });
}

app.UseCors("AllowAngularApp");
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();

app.Run();

/// <summary>Exposes the entry point to WebApplicationFactory in the integration tests.</summary>
public partial class Program { }
