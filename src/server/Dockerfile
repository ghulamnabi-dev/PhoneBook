# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["PhoneBook.Api.csproj", "./"]
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
# SQLite file lives on a volume-friendly path; set Database__Provider=SqlServer + ConnectionStrings__DefaultConnection to switch.
ENV ConnectionStrings__DefaultConnection="Data Source=/app/data/phonebook.db"
RUN mkdir -p /app/data && chown "$APP_UID" /app/data
EXPOSE 8080
COPY --from=build /app/publish .
USER $APP_UID
ENTRYPOINT ["dotnet", "PhoneBook.Api.dll"]
