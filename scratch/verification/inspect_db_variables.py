import prisma
import asyncio
import json

async def main():
    from prisma import Prisma
    db = Prisma()
    await db.connect()
    
    # Get the latest session
    session = await db.calcsession.find_first(
        order={"createdAt": "desc"},
        include={"nodeExecutions": True}
    )
    if not session:
        print("No sessions found")
        await db.disconnect()
        return
        
    print("Session ID:", session.id)
    print("Status:", session.status)
    print("Variables:")
    print(json.dumps(session.variables, indent=2))
    
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
