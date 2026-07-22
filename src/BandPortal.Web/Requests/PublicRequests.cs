namespace BandPortal.Web.Requests;

public sealed record CreateOrderRequest(
    string CustomerName,
    string Email,
    string? PhoneNumber,
    string? InstagramHandle,
    string? Notes,
    List<CreateOrderLineRequest> Lines);

public sealed record CreateOrderLineRequest(
    Guid ItemId,
    Guid VariantId,
    int Quantity);
