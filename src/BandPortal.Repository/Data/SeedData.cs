namespace BandPortal.Repository.Data;

public static class SeedData
{
    public static BandDatabase Create()
    {
        return new BandDatabase
        {
            Shows = [],
            News = [],
            Merch = [],
            Orders = []
        };
    }
}
