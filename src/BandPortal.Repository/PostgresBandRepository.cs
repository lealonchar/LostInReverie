using System.Data;
using BandPortal.Domain.Entities;
using BandPortal.Repository.Data;
using Npgsql;

namespace BandPortal.Repository;

public sealed class PostgresBandRepository(string connectionString) : IBandRepository
{
    private const long RepositoryLockId = 918273645;
    private readonly SemaphoreSlim _initGate = new(1, 1);
    private bool _isInitialized;

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
        await EnsureInitializedAsync(cancellationToken);

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);

        await ExecuteAsync(
            connection,
            transaction,
            "select pg_advisory_xact_lock(@lock_id);",
            command => command.Parameters.AddWithValue("lock_id", RepositoryLockId),
            cancellationToken);

        var database = await LoadAsync(connection, transaction, cancellationToken);
        var result = update(database);
        await SaveAsync(connection, transaction, database, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return result;
    }

    private async Task<BandDatabase> ReadAsync(CancellationToken cancellationToken)
    {
        await EnsureInitializedAsync(cancellationToken);

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        return await LoadAsync(connection, null, cancellationToken);
    }

    private async Task EnsureInitializedAsync(CancellationToken cancellationToken)
    {
        if (_isInitialized)
        {
            return;
        }

        await _initGate.WaitAsync(cancellationToken);

        try
        {
            if (_isInitialized)
            {
                return;
            }

            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);
            await ExecuteAsync(connection, null, SchemaSql, null, cancellationToken);
            _isInitialized = true;
        }
        finally
        {
            _initGate.Release();
        }
    }

    private static async Task<BandDatabase> LoadAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction? transaction,
        CancellationToken cancellationToken)
    {
        var database = new BandDatabase
        {
            Shows = await LoadShowsAsync(connection, transaction, cancellationToken),
            News = await LoadNewsAsync(connection, transaction, cancellationToken),
            Music = await LoadMusicAsync(connection, transaction, cancellationToken),
            Merch = await LoadMerchAsync(connection, transaction, cancellationToken),
            Orders = await LoadOrdersAsync(connection, transaction, cancellationToken)
        };

        return database;
    }

    private static async Task<List<Show>> LoadShowsAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction? transaction,
        CancellationToken cancellationToken)
    {
        const string sql = """
            select id, title, venue, city, starts_at, ticket_url, notes, is_sold_out
            from shows
            order by starts_at;
            """;

        var shows = new List<Show>();
        await using var command = new NpgsqlCommand(sql, connection, transaction);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            shows.Add(new Show
            {
                Id = reader.GetGuid(0),
                Title = reader.GetString(1),
                Venue = reader.GetString(2),
                City = reader.GetString(3),
                StartsAt = reader.GetFieldValue<DateTimeOffset>(4),
                TicketUrl = reader.IsDBNull(5) ? null : reader.GetString(5),
                Notes = reader.GetString(6),
                IsSoldOut = reader.GetBoolean(7)
            });
        }

        return shows;
    }

    private static async Task<List<NewsPost>> LoadNewsAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction? transaction,
        CancellationToken cancellationToken)
    {
        const string sql = """
            select id, title, category, body, published_at, is_pinned
            from news_posts
            order by published_at desc;
            """;

        var posts = new List<NewsPost>();
        await using var command = new NpgsqlCommand(sql, connection, transaction);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            posts.Add(new NewsPost
            {
                Id = reader.GetGuid(0),
                Title = reader.GetString(1),
                Category = reader.GetString(2),
                Body = reader.GetString(3),
                PublishedAt = reader.GetFieldValue<DateTimeOffset>(4),
                IsPinned = reader.GetBoolean(5)
            });
        }

        return posts;
    }

    private static async Task<List<MusicRelease>> LoadMusicAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction? transaction,
        CancellationToken cancellationToken)
    {
        const string releasesSql = """
            select id, title, release_type, release_year, cover_image_url, listen_url, embed_url, is_published
            from music_releases
            order by release_year desc, title;
            """;

        const string linksSql = """
            select id, music_release_id, platform, url
            from music_release_links
            order by music_release_id, link_index;
            """;

        var releases = new List<MusicRelease>();
        var releasesById = new Dictionary<Guid, MusicRelease>();

        await using (var command = new NpgsqlCommand(releasesSql, connection, transaction))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var release = new MusicRelease
                {
                    Id = reader.GetGuid(0),
                    Title = reader.GetString(1),
                    ReleaseType = reader.GetString(2),
                    ReleaseYear = reader.GetInt32(3),
                    CoverImageUrl = reader.GetString(4),
                    ListenUrl = reader.GetString(5),
                    EmbedUrl = reader.IsDBNull(6) ? null : reader.GetString(6),
                    IsPublished = reader.GetBoolean(7),
                    Links = []
                };
                releases.Add(release);
                releasesById[release.Id] = release;
            }
        }

        await using (var command = new NpgsqlCommand(linksSql, connection, transaction))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var releaseId = reader.GetGuid(1);

                if (!releasesById.TryGetValue(releaseId, out var release))
                {
                    continue;
                }

                release.Links.Add(new MusicPlatformLink
                {
                    Id = reader.GetGuid(0),
                    Platform = reader.GetString(2),
                    Url = reader.GetString(3)
                });
            }
        }

        return releases;
    }

    private static async Task<List<MerchItem>> LoadMerchAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction? transaction,
        CancellationToken cancellationToken)
    {
        const string itemsSql = """
            select id, name, description, price, image_url, is_active
            from merch_items
            order by name;
            """;

        const string variantsSql = """
            select id, merch_item_id, label, sku, stock
            from merch_variants
            order by label;
            """;

        const string imagesSql = """
            select merch_item_id, image_url
            from merch_images
            order by merch_item_id, image_index;
            """;

        var items = new List<MerchItem>();
        var itemsById = new Dictionary<Guid, MerchItem>();

        await using (var command = new NpgsqlCommand(itemsSql, connection, transaction))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var item = new MerchItem
                {
                    Id = reader.GetGuid(0),
                    Name = reader.GetString(1),
                    Description = reader.GetString(2),
                    Price = reader.GetDecimal(3),
                    ImageUrl = reader.GetString(4),
                    IsActive = reader.GetBoolean(5),
                    ImageUrls = [],
                    Variants = []
                };
                items.Add(item);
                itemsById[item.Id] = item;
            }
        }

        await using (var command = new NpgsqlCommand(variantsSql, connection, transaction))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var itemId = reader.GetGuid(1);

                if (!itemsById.TryGetValue(itemId, out var item))
                {
                    continue;
                }

                item.Variants.Add(new MerchVariant
                {
                    Id = reader.GetGuid(0),
                    Label = reader.GetString(2),
                    Sku = reader.GetString(3),
                    Stock = reader.GetInt32(4)
                });
            }
        }

        await using (var command = new NpgsqlCommand(imagesSql, connection, transaction))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var itemId = reader.GetGuid(0);

                if (!itemsById.TryGetValue(itemId, out var item))
                {
                    continue;
                }

                item.ImageUrls.Add(reader.GetString(1));
            }
        }

        foreach (var item in items)
        {
            item.ImageUrls = NormalizeImageUrls(item);
            item.ImageUrl = item.ImageUrls.FirstOrDefault() ?? "";
        }

        return items;
    }

    private static async Task<List<OrderRequest>> LoadOrdersAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction? transaction,
        CancellationToken cancellationToken)
    {
        const string ordersSql = """
            select id, customer_name, email, phone_number, instagram_handle, notes, created_at, status, total
            from order_requests
            order by created_at desc;
            """;

        const string linesSql = """
            select order_lines.order_id,
                   order_lines.item_id,
                   order_lines.variant_id,
                   order_lines.item_name,
                   coalesce(nullif(order_lines.image_url, ''), merch_items.image_url, '') as image_url,
                   order_lines.variant_label,
                   order_lines.quantity,
                   order_lines.unit_price
            from order_lines
            left join merch_items on merch_items.id = order_lines.item_id
            order by order_lines.order_id, order_lines.order_index;
            """;

        var orders = new List<OrderRequest>();
        var ordersById = new Dictionary<Guid, OrderRequest>();

        await using (var command = new NpgsqlCommand(ordersSql, connection, transaction))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var order = new OrderRequest
                {
                    Id = reader.GetGuid(0),
                    CustomerName = reader.GetString(1),
                    Email = reader.GetString(2),
                    PhoneNumber = reader.GetString(3),
                    InstagramHandle = reader.IsDBNull(4) ? null : reader.GetString(4),
                    Notes = reader.IsDBNull(5) ? null : reader.GetString(5),
                    CreatedAt = reader.GetFieldValue<DateTimeOffset>(6),
                    Status = ParseOrderStatus(reader.GetString(7)),
                    Total = reader.GetDecimal(8),
                    Lines = []
                };
                orders.Add(order);
                ordersById[order.Id] = order;
            }
        }

        await using (var command = new NpgsqlCommand(linesSql, connection, transaction))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var orderId = reader.GetGuid(0);

                if (!ordersById.TryGetValue(orderId, out var order))
                {
                    continue;
                }

                order.Lines.Add(new OrderLine
                {
                    ItemId = reader.GetGuid(1),
                    VariantId = reader.GetGuid(2),
                    ItemName = reader.GetString(3),
                    ImageUrl = reader.GetString(4),
                    VariantLabel = reader.GetString(5),
                    Quantity = reader.GetInt32(6),
                    UnitPrice = reader.GetDecimal(7)
                });
            }
        }

        return orders;
    }

    private static async Task SaveAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        BandDatabase database,
        CancellationToken cancellationToken)
    {
        await ExecuteAsync(
            connection,
            transaction,
            """
            delete from order_lines;
            delete from order_requests;
            delete from merch_images;
            delete from merch_variants;
            delete from merch_items;
            delete from music_release_links;
            delete from music_releases;
            delete from news_posts;
            delete from shows;
            """,
            null,
            cancellationToken);

        foreach (var show in database.Shows)
        {
            await ExecuteAsync(
                connection,
                transaction,
                """
                insert into shows (id, title, venue, city, starts_at, ticket_url, notes, is_sold_out)
                values (@id, @title, @venue, @city, @starts_at, @ticket_url, @notes, @is_sold_out);
                """,
                command =>
                {
                    command.Parameters.AddWithValue("id", show.Id);
                    command.Parameters.AddWithValue("title", show.Title);
                    command.Parameters.AddWithValue("venue", show.Venue);
                    command.Parameters.AddWithValue("city", show.City);
                    command.Parameters.AddWithValue("starts_at", show.StartsAt.ToUniversalTime());
                    command.Parameters.AddWithValue("ticket_url", (object?)show.TicketUrl ?? DBNull.Value);
                    command.Parameters.AddWithValue("notes", show.Notes);
                    command.Parameters.AddWithValue("is_sold_out", show.IsSoldOut);
                },
                cancellationToken);
        }

        foreach (var post in database.News)
        {
            await ExecuteAsync(
                connection,
                transaction,
                """
                insert into news_posts (id, title, category, body, published_at, is_pinned)
                values (@id, @title, @category, @body, @published_at, @is_pinned);
                """,
                command =>
                {
                    command.Parameters.AddWithValue("id", post.Id);
                    command.Parameters.AddWithValue("title", post.Title);
                    command.Parameters.AddWithValue("category", post.Category);
                    command.Parameters.AddWithValue("body", post.Body);
                    command.Parameters.AddWithValue("published_at", post.PublishedAt.ToUniversalTime());
                    command.Parameters.AddWithValue("is_pinned", post.IsPinned);
                },
                cancellationToken);
        }

        foreach (var release in database.Music)
        {
            await ExecuteAsync(
                connection,
                transaction,
                """
                insert into music_releases (
                    id, title, release_type, release_year, cover_image_url, listen_url, embed_url, is_published)
                values (
                    @id, @title, @release_type, @release_year, @cover_image_url, @listen_url, @embed_url, @is_published);
                """,
                command =>
                {
                    command.Parameters.AddWithValue("id", release.Id);
                    command.Parameters.AddWithValue("title", release.Title);
                    command.Parameters.AddWithValue("release_type", release.ReleaseType);
                    command.Parameters.AddWithValue("release_year", release.ReleaseYear);
                    command.Parameters.AddWithValue("cover_image_url", release.CoverImageUrl);
                    command.Parameters.AddWithValue("listen_url", release.ListenUrl);
                    command.Parameters.AddWithValue("embed_url", (object?)release.EmbedUrl ?? DBNull.Value);
                    command.Parameters.AddWithValue("is_published", release.IsPublished);
                },
                cancellationToken);

            for (var linkIndex = 0; linkIndex < release.Links.Count; linkIndex++)
            {
                var link = release.Links[linkIndex];

                await ExecuteAsync(
                    connection,
                    transaction,
                    """
                    insert into music_release_links (id, music_release_id, link_index, platform, url)
                    values (@id, @music_release_id, @link_index, @platform, @url);
                    """,
                    command =>
                    {
                        command.Parameters.AddWithValue("id", link.Id);
                        command.Parameters.AddWithValue("music_release_id", release.Id);
                        command.Parameters.AddWithValue("link_index", linkIndex);
                        command.Parameters.AddWithValue("platform", link.Platform);
                        command.Parameters.AddWithValue("url", link.Url);
                    },
                    cancellationToken);
            }
        }

        foreach (var item in database.Merch)
        {
            item.ImageUrls = NormalizeImageUrls(item);
            item.ImageUrl = item.ImageUrls.FirstOrDefault() ?? "";

            await ExecuteAsync(
                connection,
                transaction,
                """
                insert into merch_items (id, name, description, price, image_url, is_active)
                values (@id, @name, @description, @price, @image_url, @is_active);
                """,
                command =>
                {
                    command.Parameters.AddWithValue("id", item.Id);
                    command.Parameters.AddWithValue("name", item.Name);
                    command.Parameters.AddWithValue("description", item.Description);
                    command.Parameters.AddWithValue("price", item.Price);
                    command.Parameters.AddWithValue("image_url", item.ImageUrl);
                    command.Parameters.AddWithValue("is_active", item.IsActive);
                },
                cancellationToken);

            for (var imageIndex = 0; imageIndex < item.ImageUrls.Count; imageIndex++)
            {
                await ExecuteAsync(
                    connection,
                    transaction,
                    """
                    insert into merch_images (merch_item_id, image_index, image_url)
                    values (@merch_item_id, @image_index, @image_url);
                    """,
                    command =>
                    {
                        command.Parameters.AddWithValue("merch_item_id", item.Id);
                        command.Parameters.AddWithValue("image_index", imageIndex);
                        command.Parameters.AddWithValue("image_url", item.ImageUrls[imageIndex]);
                    },
                    cancellationToken);
            }

            foreach (var variant in item.Variants)
            {
                await ExecuteAsync(
                    connection,
                    transaction,
                    """
                    insert into merch_variants (id, merch_item_id, label, sku, stock)
                    values (@id, @merch_item_id, @label, @sku, @stock);
                    """,
                    command =>
                    {
                        command.Parameters.AddWithValue("id", variant.Id);
                        command.Parameters.AddWithValue("merch_item_id", item.Id);
                        command.Parameters.AddWithValue("label", variant.Label);
                        command.Parameters.AddWithValue("sku", variant.Sku);
                        command.Parameters.AddWithValue("stock", variant.Stock);
                    },
                    cancellationToken);
            }
        }

        foreach (var order in database.Orders)
        {
            await ExecuteAsync(
                connection,
                transaction,
                """
                insert into order_requests (
                    id, customer_name, email, phone_number, instagram_handle, notes, created_at, status, total)
                values (
                    @id, @customer_name, @email, @phone_number, @instagram_handle, @notes, @created_at, @status, @total);
                """,
                command =>
                {
                    command.Parameters.AddWithValue("id", order.Id);
                    command.Parameters.AddWithValue("customer_name", order.CustomerName);
                    command.Parameters.AddWithValue("email", order.Email);
                    command.Parameters.AddWithValue("phone_number", order.PhoneNumber);
                    command.Parameters.AddWithValue("instagram_handle", (object?)order.InstagramHandle ?? DBNull.Value);
                    command.Parameters.AddWithValue("notes", (object?)order.Notes ?? DBNull.Value);
                    command.Parameters.AddWithValue("created_at", order.CreatedAt.ToUniversalTime());
                    command.Parameters.AddWithValue("status", order.Status.ToString());
                    command.Parameters.AddWithValue("total", order.Total);
                },
                cancellationToken);

            for (var index = 0; index < order.Lines.Count; index++)
            {
                var line = order.Lines[index];

                await ExecuteAsync(
                    connection,
                    transaction,
                    """
                    insert into order_lines (
                        order_id, order_index, item_id, variant_id, item_name, image_url, variant_label, quantity, unit_price)
                    values (
                        @order_id, @order_index, @item_id, @variant_id, @item_name, @image_url, @variant_label, @quantity, @unit_price);
                    """,
                    command =>
                    {
                        command.Parameters.AddWithValue("order_id", order.Id);
                        command.Parameters.AddWithValue("order_index", index);
                        command.Parameters.AddWithValue("item_id", line.ItemId);
                        command.Parameters.AddWithValue("variant_id", line.VariantId);
                        command.Parameters.AddWithValue("item_name", line.ItemName);
                        command.Parameters.AddWithValue("image_url", line.ImageUrl);
                        command.Parameters.AddWithValue("variant_label", line.VariantLabel);
                        command.Parameters.AddWithValue("quantity", line.Quantity);
                        command.Parameters.AddWithValue("unit_price", line.UnitPrice);
                    },
                    cancellationToken);
            }
        }
    }

    private static async Task ExecuteAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction? transaction,
        string sql,
        Action<NpgsqlCommand>? configure,
        CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(sql, connection, transaction);
        configure?.Invoke(command);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static List<string> NormalizeImageUrls(MerchItem item)
    {
        return new[] { item.ImageUrl }
            .Concat(item.ImageUrls)
            .Select(url => url.Trim())
            .Where(url => !string.IsNullOrWhiteSpace(url))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static OrderStatus ParseOrderStatus(string value)
    {
        return Enum.TryParse<OrderStatus>(value, ignoreCase: true, out var status)
            ? status
            : OrderStatus.Pending;
    }

    private const string SchemaSql = """
        create table if not exists shows (
            id uuid primary key,
            title text not null,
            venue text not null,
            city text not null,
            starts_at timestamptz not null,
            ticket_url text null,
            notes text not null,
            is_sold_out boolean not null
        );

        create table if not exists news_posts (
            id uuid primary key,
            title text not null,
            category text not null,
            body text not null,
            published_at timestamptz not null,
            is_pinned boolean not null
        );

        create table if not exists music_releases (
            id uuid primary key,
            title text not null,
            release_type text not null,
            release_year integer not null,
            cover_image_url text not null,
            listen_url text not null,
            embed_url text null,
            is_published boolean not null
        );

        create table if not exists music_release_links (
            id uuid primary key,
            music_release_id uuid not null references music_releases(id) on delete cascade,
            link_index integer not null,
            platform text not null,
            url text not null
        );

        create table if not exists merch_items (
            id uuid primary key,
            name text not null,
            description text not null,
            price numeric(12, 2) not null,
            image_url text not null,
            is_active boolean not null
        );

        create table if not exists merch_images (
            merch_item_id uuid not null references merch_items(id) on delete cascade,
            image_index integer not null,
            image_url text not null,
            primary key (merch_item_id, image_index)
        );

        create table if not exists merch_variants (
            id uuid primary key,
            merch_item_id uuid not null references merch_items(id) on delete cascade,
            label text not null,
            sku text not null,
            stock integer not null check (stock >= 0)
        );

        create table if not exists order_requests (
            id uuid primary key,
            customer_name text not null,
            email text not null,
            phone_number text not null default '',
            instagram_handle text null,
            notes text null,
            created_at timestamptz not null,
            status text not null,
            total numeric(12, 2) not null
        );

        create table if not exists order_lines (
            order_id uuid not null references order_requests(id) on delete cascade,
            order_index integer not null,
            item_id uuid not null,
            variant_id uuid not null,
            item_name text not null,
            image_url text not null default '',
            variant_label text not null,
            quantity integer not null check (quantity > 0),
            unit_price numeric(12, 2) not null,
            primary key (order_id, order_index)
        );

        alter table order_requests
            add column if not exists phone_number text not null default '';

        alter table order_lines
            add column if not exists image_url text not null default '';
        """;
}
