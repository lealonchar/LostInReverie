FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY BandPortal.slnx ./
COPY NuGet/NuGet.Config ./NuGet/NuGet.Config
COPY src/BandPortal.Domain/BandPortal.Domain.csproj src/BandPortal.Domain/
COPY src/BandPortal.Repository/BandPortal.Repository.csproj src/BandPortal.Repository/
COPY src/BandPortal.Service/BandPortal.Service.csproj src/BandPortal.Service/
COPY src/BandPortal.Web/BandPortal.Web.csproj src/BandPortal.Web/
COPY src/BandPortal.Web/NuGet.Config src/BandPortal.Web/
RUN dotnet restore src/BandPortal.Web/BandPortal.Web.csproj

COPY src/ ./src/
RUN dotnet publish src/BandPortal.Web/BandPortal.Web.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app/publish .
VOLUME ["/app/App_Data/uploads"]
ENTRYPOINT ["dotnet", "BandPortal.Web.dll"]
