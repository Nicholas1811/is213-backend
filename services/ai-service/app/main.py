import asyncio
import logging


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


logger = logging.getLogger("ai-service")


async def run_worker() -> None:
    logger.info("AI worker starting")

    while True:  # tells the worker to to stay alive forever!
        await asyncio.sleep(60)


async def main() -> None:
    await run_worker()


if __name__ == "__main__":
    asyncio.run(main())
