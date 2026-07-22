namespace BandPortal.Service.Models;

public sealed record ServiceResult<T>(T? Value, string? Error)
{
    public bool IsSuccess => Error is null;

    public static ServiceResult<T> Success(T value)
    {
        return new ServiceResult<T>(value, null);
    }

    public static ServiceResult<T> Failure(string error)
    {
        return new ServiceResult<T>(default, error);
    }
}
