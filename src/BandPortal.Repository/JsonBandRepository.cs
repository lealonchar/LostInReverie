using System.Text.Json;
using System.Text.Json.Serialization;
using BandPortal.Domain.Entities;
using BandPortal.Repository.Data;

namespace BandPortal.Repository;

public sealed class JsonBandRepository : IBandRepository
{
    private readonly string _databasePath;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly JsonSerializerOptions _jsonOptions;

    public JsonBandRepository(string databasePath)
    {
        _jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            WriteIndented = true
        };
        _jsonOptions.Converters.Add(new JsonStringEnumConverter());

        var dataDirectory = Path.GetDirectoryName(databasePath)
            ?? throw new InvalidOperationException("Database path must include a directory.");

        Directory.CreateDirectory(dataDirectory);
        _databasePath = databasePath;
    }

    public async Task<IReadOnlyList<Show>> GetShowsAsync(CancellationToken cancellationToken = default)
    {
        var database = await ReadAsync(cancellationToken);
        return database.Shows;
    }

    public async Task<IReadOnlyList<NewsPost>> GetNewsAsync(CancellationToken cancellationToken = default)
    {
        var database = await ReadAsync(cancellationToken);
        return database.News;
    }

    public async Task<IReadOnlyList<MusicRelease>> GetMusicAsync(CancellationToken cancellationToken = default)
    {
        var database = await ReadAsync(cancellationToken);
        return database.Music;
    }

    public async Task<IReadOnlyList<MerchItem>> GetMerchAsync(CancellationToken cancellationToken = default)
    {
        var database = await ReadAsync(cancellationToken);
        return database.Merch;
    }

    public async Task<IReadOnlyList<OrderRequest>> GetOrdersAsync(CancellationToken cancellationToken = default)
    {
        var database = await ReadAsync(cancellationToken);
        return database.Orders;
    }

    public async Task<T> UpdateAsync<T>(
        Func<BandDatabase, T> update,
        CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);

        try
        {
            var database = await LoadAsync(cancellationToken);
            var result = update(database);
            await SaveAsync(database, cancellationToken);
            return result;
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task<BandDatabase> ReadAsync(CancellationToken cancellationToken)
    {
        await _gate.WaitAsync(cancellationToken);

        try
        {
            return await LoadAsync(cancellationToken);
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task<BandDatabase> LoadAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_databasePath))
        {
            var seed = SeedData.Create();
            await SaveAsync(seed, cancellationToken);
            return seed;
        }

        var json = await File.ReadAllTextAsync(_databasePath, cancellationToken);
        return JsonSerializer.Deserialize<BandDatabase>(json, _jsonOptions) ?? SeedData.Create();
    }

    private Task SaveAsync(BandDatabase database, CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(database, _jsonOptions);
        return File.WriteAllTextAsync(_databasePath, json, cancellationToken);
    }
}
