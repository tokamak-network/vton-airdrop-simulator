import { NextRequest, NextResponse } from "next/server";
import { generateMockStakers } from "@/lib/mock-data";
import { fetchStakers } from "@/lib/graph/queries";
import { fetchSeigniorageData } from "@/lib/ethereum/seigniorage";
import type { StakerLookupResponse } from "@/lib/types";

const RAY = BigInt("1000000000000000000000000000"); // 1e27

const USE_SUBGRAPH =
  process.env.NEXT_PUBLIC_SUBGRAPH_URL &&
  !process.env.NEXT_PUBLIC_SUBGRAPH_URL.includes("YOUR_ID");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const minAmountStr = searchParams.get("minAmount");

    if (!fromDate || !toDate || !minAmountStr) {
      return NextResponse.json(
        { error: "Missing required parameters: from, to, minAmount" },
        { status: 400 }
      );
    }

    const from = Math.floor(new Date(fromDate).getTime() / 1000);
    const to = Math.floor(new Date(toDate).getTime() / 1000);
    const minAmountWton = parseFloat(minAmountStr);

    if (isNaN(from) || isNaN(to) || isNaN(minAmountWton)) {
      return NextResponse.json(
        { error: "Invalid parameter values" },
        { status: 400 }
      );
    }

    // Convert WTON amount to RAY for subgraph query
    const minAmountRay = (
      BigInt(Math.floor(minAmountWton)) * RAY
    ).toString();

    let stakers;

    if (USE_SUBGRAPH) {
      stakers = await fetchStakers(minAmountRay, from, to);
    } else {
      // Mock data fallback
      stakers = generateMockStakers(from, to, minAmountWton);
    }

    // Only include stakers who deposited at least once in the period
    stakers = stakers.filter((s) => s.depositCount > 0);

    // Fetch on-chain stakeOf for seigniorage calculation
    if (USE_SUBGRAPH) {
      const addresses = stakers.map((s) => s.address);
      const stakeOfMap = await fetchSeigniorageData(addresses);

      for (const s of stakers) {
        const currentStake = stakeOfMap.get(s.address.toLowerCase()) ?? BigInt(0);
        s.currentStake = currentStake.toString();
        const seigniorage =
          currentStake + BigInt(s.lifetimeWithdrawn) - BigInt(s.lifetimeDeposited);
        s.seigniorage = (seigniorage > BigInt(0) ? seigniorage : BigInt(0)).toString();
      }
    }

    // Calculate summary (net = deposits - withdrawals)
    let totalStakedBigInt = BigInt(0);
    let totalSeigniorageBigInt = BigInt(0);
    for (const s of stakers) {
      totalStakedBigInt += BigInt(s.totalStaked) - BigInt(s.totalWithdrawn);
      totalSeigniorageBigInt += BigInt(s.seigniorage);
    }

    const response: StakerLookupResponse = {
      stakers,
      totalCount: stakers.length,
      summary: {
        uniqueStakers: stakers.length,
        totalStakedAmount: totalStakedBigInt.toString(),
        totalSeigniorage: totalSeigniorageBigInt.toString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Staker lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
