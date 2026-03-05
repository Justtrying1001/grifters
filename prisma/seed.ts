import { PrismaClient, IncidentType, IncidentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeRiskScore } from "../src/lib/risk-score";

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@grifter.io" },
    update: {},
    create: {
      email: "admin@grifter.io",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log(`Admin user: ${admin.email}`);

  // ─── PEOPLE ───────────────────────────────────────────────────────────────

  const people = await Promise.all([
    prisma.person.upsert({
      where: { slug: "marco-veltri" },
      update: {},
      create: {
        slug: "marco-veltri",
        name: "Marco Veltri",
        aliases: ["CryptoMarco", "MVeltri", "MarcoDefi"],
        roles: ["Founder", "Influencer"],
        socials: {
          twitter: "https://twitter.com/cryptomarco_fake",
          telegram: "https://t.me/cryptomarco_fake",
        },
        description:
          "Alleged serial project founder linked to multiple rug pulls on Ethereum and BSC. Previously operated under the alias CryptoMarco before rebranding.",
        riskScore: 0,
        riskLabel: "LOW",
      },
    }),

    prisma.person.upsert({
      where: { slug: "sienna-blackwood" },
      update: {},
      create: {
        slug: "sienna-blackwood",
        name: "Sienna Blackwood",
        aliases: ["SBWood", "DeFiSienna"],
        roles: ["Influencer", "Paid Promoter"],
        socials: {
          twitter: "https://twitter.com/defisienna_fake",
          youtube: "https://youtube.com/@defisienna_fake",
        },
        description:
          "Crypto influencer with a documented history of promoting projects without disclosure of paid arrangements. Associated with at least two projects that later collapsed.",
        riskScore: 0,
        riskLabel: "LOW",
      },
    }),

    prisma.person.upsert({
      where: { slug: "derek-osei" },
      update: {},
      create: {
        slug: "derek-osei",
        name: "Derek Osei",
        aliases: ["DOsei_Crypto", "OSEIcap"],
        roles: ["Developer", "Smart Contract Engineer"],
        socials: {
          twitter: "https://twitter.com/doseicrypto_fake",
          github: "https://github.com/doseicrypto_fake",
        },
        description:
          "Smart contract developer linked to projects with exploitable backdoors. On-chain analysis associates the deployer wallets with later drain transactions.",
        riskScore: 0,
        riskLabel: "LOW",
      },
    }),

    prisma.person.upsert({
      where: { slug: "priya-nkosi" },
      update: {},
      create: {
        slug: "priya-nkosi",
        name: "Priya Nkosi",
        aliases: ["PNkosi_DeFi", "YieldPriya"],
        roles: ["Co-founder", "Marketing Lead"],
        socials: {
          twitter: "https://twitter.com/yieldpriya_fake",
        },
        description:
          "Co-founder of two failed DeFi yield protocols. Allegedly misrepresented audit status and fund usage in promotional materials.",
        riskScore: 0,
        riskLabel: "LOW",
      },
    }),

    prisma.person.upsert({
      where: { slug: "luca-ferreira" },
      update: {},
      create: {
        slug: "luca-ferreira",
        name: "Luca Ferreira",
        aliases: ["LFchain", "FerreiraWeb3"],
        roles: ["VC", "Angel Investor", "Advisor"],
        socials: {
          twitter: "https://twitter.com/lfchain_fake",
          linkedin: "https://linkedin.com/in/lucaferreira_fake",
        },
        description:
          "Self-described crypto VC who reportedly purchased large allocations pre-launch and coordinated promotional campaigns before dumping tokens on retail investors.",
        riskScore: 0,
        riskLabel: "LOW",
      },
    }),
  ]);

  console.log(`Created ${people.length} people`);

  // ─── PROJECTS ─────────────────────────────────────────────────────────────

  const projects = await Promise.all([
    prisma.project.upsert({
      where: { slug: "moonrise-finance" },
      update: {},
      create: {
        slug: "moonrise-finance",
        name: "MoonRise Finance",
        chain: "Ethereum",
        category: "DeFi / Yield",
        links: {
          website: "https://moonrisefinance.fake",
          twitter: "https://twitter.com/moonrisefinance_fake",
        },
        contractAddresses: [
          "0xDEAD000000000000000042069420694206942069",
          "0xBEEF000000000000000042069420694206942069",
        ],
        description:
          "A yield aggregator that promised 10,000% APY through 'proprietary algorithms'. The project collapsed within 4 months of launch. Liquidity was drained by the deployer wallet.",
        riskScore: 0,
        riskLabel: "LOW",
      },
    }),

    prisma.project.upsert({
      where: { slug: "dragonwave-nft" },
      update: {},
      create: {
        slug: "dragonwave-nft",
        name: "DragonWave NFT",
        chain: "Ethereum",
        category: "NFT",
        links: {
          website: "https://dragonwavenft.fake",
          twitter: "https://twitter.com/dragonwavenft_fake",
          opensea: "https://opensea.io/collection/dragonwave_fake",
        },
        contractAddresses: ["0xCAFE000000000000000042069420694206942069"],
        description:
          "An NFT collection that promised holder benefits including staking rewards and metaverse land access. Team disappeared after mint, social media accounts were deleted.",
        riskScore: 0,
        riskLabel: "LOW",
      },
    }),

    prisma.project.upsert({
      where: { slug: "velox-protocol" },
      update: {},
      create: {
        slug: "velox-protocol",
        name: "Velox Protocol",
        chain: "BNB Chain",
        category: "DeFi / DEX",
        links: {
          website: "https://veloxprotocol.fake",
          twitter: "https://twitter.com/veloxprotocol_fake",
        },
        contractAddresses: ["0xF00D000000000000000042069420694206942069"],
        description:
          "A decentralized exchange that conducted a public IDO raising ~$2.1M. Post-launch, the team allegedly executed an insider dump via pre-mined tokens, crashing the price by 94% within 72 hours.",
        riskScore: 0,
        riskLabel: "LOW",
      },
    }),

    prisma.project.upsert({
      where: { slug: "solarvault-dao" },
      update: {},
      create: {
        slug: "solarvault-dao",
        name: "SolarVault DAO",
        chain: "Solana",
        category: "DAO / Treasury",
        links: {
          website: "https://solarvaultdao.fake",
          twitter: "https://twitter.com/solarvaultdao_fake",
        },
        contractAddresses: [],
        description:
          "A DAO that claimed to invest in green energy infrastructure using community funds. The treasury address was reportedly controlled by a single private key, and funds were transferred to CEX wallets within 6 months.",
        riskScore: 0,
        riskLabel: "LOW",
      },
    }),

    prisma.project.upsert({
      where: { slug: "neostream-token" },
      update: {},
      create: {
        slug: "neostream-token",
        name: "NeoStream Token",
        chain: "Polygon",
        category: "Utility Token / Media",
        links: {
          website: "https://neostreamtoken.fake",
          twitter: "https://twitter.com/neostreamtoken_fake",
        },
        contractAddresses: ["0xBAD0000000000000000042069420694206942069"],
        description:
          "A utility token marketed for a streaming platform that was never built. Multiple influencers were paid to promote the token without disclosure. The platform roadmap was plagiarized from a legitimate project.",
        riskScore: 0,
        riskLabel: "LOW",
      },
    }),
  ]);

  console.log(`Created ${projects.length} projects`);

  // ─── INCIDENTS ────────────────────────────────────────────────────────────

  type IncidentSeed = {
    slug: string;
    type: IncidentType;
    date: Date;
    summary: string;
    narrative: string;
    status: IncidentStatus;
    sources: Array<{
      url: string;
      title: string;
      excerpt?: string;
      archiveUrl?: string;
    }>;
    personSlugs: string[];
    projectSlugs: string[];
  };

  const incidentSeeds: IncidentSeed[] = [
    {
      slug: "moonrise-finance-rug-pull-2023",
      type: "RUG_PULL",
      date: new Date("2023-08-14"),
      summary:
        "MoonRise Finance deployer drained $4.2M in liquidity within minutes of triggering a hidden admin function.",
      narrative:
        "On August 14, 2023, the MoonRise Finance protocol experienced what blockchain analysts have characterized as a rug pull. The deployer wallet, linked to Marco Veltri, called an undisclosed admin function that bypassed the standard 7-day timelock advertised in the project's documentation. Within approximately 8 minutes, all liquidity provider funds — totaling approximately $4.2M in ETH and stablecoins — were drained to a series of intermediary wallets and ultimately bridged to Tornado Cash. The project's website and social media accounts were taken offline within the same hour. On-chain analysis by independent researchers identified the deployer wallet as one used previously in two other failed projects. Over 2,300 unique wallet addresses suffered losses. A community-organized legal fund was established but no legal action has been confirmed as of this writing. All information here is reported and alleged; no formal legal determinations have been made.",
      status: "APPROVED",
      sources: [
        {
          url: "https://rekt.news/moonrise-rekt-fake",
          title: "MoonRise Finance — REKT (Alleged)",
          excerpt:
            "The deployer called a hidden mintOwner() function, bypassing the advertised timelock. All LP positions were drained in under 10 minutes.",
          archiveUrl: "https://web.archive.org/web/2023/moonrise-rekt-fake",
        },
        {
          url: "https://twitter.com/peckshield_fake/status/1234567890",
          title: "PeckShield Alert: MoonRise Finance Exploit",
          excerpt:
            "We detected a suspicious transaction draining $4.2M from MoonRise Finance. The deployer address matches a wallet flagged in two prior incidents.",
        },
        {
          url: "https://etherscan.io/tx/0xDEAD000000000000000000000000000000000000000000000000000000000001",
          title: "Etherscan: Drain Transaction",
          archiveUrl:
            "https://web.archive.org/web/2023/etherscan-moonrise-fake",
        },
      ],
      personSlugs: ["marco-veltri"],
      projectSlugs: ["moonrise-finance"],
    },

    {
      slug: "velox-protocol-insider-dump-2024",
      type: "INSIDER_DUMP",
      date: new Date("2024-01-22"),
      summary:
        "Velox Protocol insiders allegedly dumped pre-mined tokens worth $1.8M within 72 hours of the public IDO, crashing the price by 94%.",
      narrative:
        "Following the Velox Protocol IDO on January 20, 2024, on-chain investigators identified a cluster of wallets that received VELX tokens at genesis, totaling approximately 18% of the supply not disclosed in the public tokenomics. Beginning approximately 48 hours after listing, these wallets systematically sold into retail buy pressure through multiple DEX routers. The price collapsed from $0.48 to $0.028 within 72 hours, representing a 94% decline. Luca Ferreira, who publicly promoted Velox Protocol as a 'top-tier DEX innovation', was identified by blockchain sleuths as a wallet recipient of 2.4M VELX tokens at genesis pricing. Ferreira has denied any wrongdoing, stating the tokens were a 'legitimate advisory allocation'. The project team has not provided a post-mortem. All information here is reported and alleged; no formal legal determinations have been made.",
      status: "APPROVED",
      sources: [
        {
          url: "https://medium.com/@cryptoinvestigator_fake/velox-insider",
          title: "On-Chain Analysis: Velox Protocol Pre-Mine Dump",
          excerpt:
            "19 wallets received VELX tokens at genesis. 14 of them began selling within 48 hours of listing. Net outflow: ~$1.8M.",
          archiveUrl:
            "https://web.archive.org/web/2024/velox-analysis-fake",
        },
        {
          url: "https://twitter.com/zachxbt_fake/status/9876543210",
          title: "ZachXBT Thread: Velox Protocol Wallet Cluster",
          excerpt:
            "Thread: Tracing the Velox Protocol wallet cluster. Wallet 0x... received 2.4M VELX at genesis and transferred to Binance 49 hours post-listing.",
        },
      ],
      personSlugs: ["luca-ferreira"],
      projectSlugs: ["velox-protocol"],
    },

    {
      slug: "dragonwave-nft-exit-scam-2023",
      type: "EXIT_SCAM",
      date: new Date("2023-03-05"),
      summary:
        "DragonWave NFT team vanished after minting 8,000 NFTs at 0.08 ETH each, collecting ~640 ETH (~$1.1M) and failing to deliver any promised utility.",
      narrative:
        "DragonWave NFT launched its public mint on February 20, 2023, selling out 8,000 NFTs at 0.08 ETH each within 6 hours. The project promised exclusive metaverse land parcels, staking rewards, and a P2E game to be launched within 90 days. By March 5, 2023, the team's Twitter, Discord, and website had gone offline without notice. The mint proceeds — approximately 640 ETH — were traced to a mixer via on-chain analysis. Derek Osei was identified as the smart contract deployer through wallet analysis. The royalty recipient wallet was subsequently emptied. A total of 6,800 distinct holders were affected. Community members organized a refund campaign, but no funds were recovered. All information here is reported and alleged; no formal legal determinations have been made.",
      status: "APPROVED",
      sources: [
        {
          url: "https://nftnow.com/features/dragonwave-exit-fake",
          title: "DragonWave NFT Team Allegedly Vanishes After $1.1M Mint",
          excerpt:
            "The DragonWave NFT team has gone dark. Website down, Discord abandoned, Twitter deleted. 8,000 NFT holders are left with worthless assets.",
          archiveUrl:
            "https://web.archive.org/web/2023/dragonwave-nftnow-fake",
        },
        {
          url: "https://opensea.io/collection/dragonwave_fake",
          title: "OpenSea: DragonWave Collection (Floor: 0.0001 ETH)",
        },
      ],
      personSlugs: ["derek-osei"],
      projectSlugs: ["dragonwave-nft"],
    },

    {
      slug: "neostream-misleading-promotion-2023",
      type: "MISLEADING_PROMOTION",
      date: new Date("2023-11-10"),
      summary:
        "NeoStream Token influencer campaign ran without paid promotion disclosures; multiple promoters received token allocations undisclosed to audiences.",
      narrative:
        "Between October and December 2023, NeoStream Token conducted a coordinated influencer marketing campaign across YouTube, Twitter, and Telegram. Blockchain investigators later identified that 14 promotional wallets received NEOSTREAM tokens prior to the public sale. Among those identified were Sienna Blackwood, who posted 12 promotional videos across two channels, and whose linked wallet received 1.5M NEOSTREAM tokens at a price of approximately $0.0001 before public listing at $0.012. Blackwood's promotional content made no disclosure of any financial arrangement or token holdings. After the token price declined 85% from its peak, affected community members compiled evidence of undisclosed arrangements. Blackwood posted a statement claiming the allocation was a 'gift from the project team' and that she 'wasn't aware it constituted a financial arrangement'. The project team, linked to Priya Nkosi, has not provided an accounting of the promotional budget. All information here is reported and alleged; no formal legal determinations have been made.",
      status: "APPROVED",
      sources: [
        {
          url: "https://protos.com/neostream-promo-fake",
          title: "NeoStream Token Promoted Without Disclosure, Investigators Allege",
          excerpt:
            "On-chain data shows 14 influencer wallets received NEOSTREAM prior to public sale. None disclosed the arrangement to their audiences.",
          archiveUrl:
            "https://web.archive.org/web/2023/neostream-protos-fake",
        },
        {
          url: "https://twitter.com/defisienna_fake/status/111222333",
          title: "Sienna Blackwood Response Statement",
          excerpt:
            "I want to address the recent allegations. I was not paid to promote NeoStream. I received tokens as a community gift and did not consider this a financial arrangement.",
        },
        {
          url: "https://coindesk.com/neostream-investigation-fake",
          title: "CoinDesk: NeoStream Promotion Transparency Investigation",
          archiveUrl:
            "https://web.archive.org/web/2023/neostream-coindesk-fake",
        },
      ],
      personSlugs: ["sienna-blackwood", "priya-nkosi"],
      projectSlugs: ["neostream-token"],
    },

    {
      slug: "solarvault-dao-scam-2023",
      type: "SCAM",
      date: new Date("2023-06-01"),
      summary:
        "SolarVault DAO raised $3.7M from 1,200+ investors for green energy investments; funds were allegedly transferred to personal wallets and never invested.",
      narrative:
        "SolarVault DAO launched in January 2023, claiming to invest community treasury funds in solar energy projects across Southeast Asia and Africa. The project raised approximately $3.7M in USDC, SOL, and ETH from over 1,200 investors. The treasury multisig was allegedly controlled by a single key held by Priya Nkosi, despite claims of a 5-of-9 multisig structure. On June 1, 2023, the full treasury balance was transferred in a single transaction to an unknown wallet, which subsequently split funds across multiple exchanges. Blockchain investigators found no evidence of any real-world energy investments. Domain registration records and entity filings cited by the project were found to be fabricated. A group of investors has filed reports with relevant financial regulators; the matter is under investigation. All information here is reported and alleged; no formal legal determinations have been made.",
      status: "APPROVED",
      sources: [
        {
          url: "https://decrypt.co/solarvault-dao-fake",
          title: "SolarVault DAO Treasury Drained: $3.7M Gone, No Investments Made",
          excerpt:
            "The SolarVault DAO treasury was emptied in a single transaction on June 1. Investigators found no evidence of any real-world investments.",
          archiveUrl:
            "https://web.archive.org/web/2023/solarvault-decrypt-fake",
        },
        {
          url: "https://twitter.com/zachxbt_fake/status/55566677788",
          title: "ZachXBT: SolarVault DAO — The Multisig That Wasn't",
          excerpt:
            "The SolarVault DAO claimed a 5-of-9 multisig but on-chain data shows a single EOA controlled all treasury movements. Thread:",
          archiveUrl:
            "https://web.archive.org/web/2023/solarvault-zachxbt-fake",
        },
        {
          url: "https://cointelegraph.com/solarvault-fake",
          title: "CoinTelegraph: SolarVault DAO Allegations — What We Know",
        },
      ],
      personSlugs: ["priya-nkosi"],
      projectSlugs: ["solarvault-dao"],
    },

    {
      slug: "velox-protocol-misleading-audit-2024",
      type: "MISLEADING_PROMOTION",
      date: new Date("2024-01-10"),
      summary:
        "Velox Protocol published a fabricated audit certificate from a non-existent security firm to build investor confidence before IDO.",
      narrative:
        "In the weeks leading up to the Velox Protocol IDO, the team published an audit report attributed to 'SecureChain Auditors', including a logo, certification number, and auditor signatures. Researchers subsequently found that SecureChain Auditors does not exist as a registered entity in any jurisdiction, the website was registered 3 days before publication, and the auditor names did not correspond to any identifiable blockchain security professionals. The audit PDF was a modified version of a legitimate audit from an unrelated project, with text replaced. On-chain analysis tied the project's communications wallet to Luca Ferreira. Ferreira has disputed the connection. All information here is reported and alleged; no formal legal determinations have been made.",
      status: "APPROVED",
      sources: [
        {
          url: "https://twitter.com/seccriteria_fake/status/202020202",
          title: "Security Researcher Thread: Velox Fake Audit",
          excerpt:
            "The SecureChain Auditors certificate published by Velox Protocol is fabricated. The entity does not exist. The domain was registered 3 days before the audit was published.",
          archiveUrl:
            "https://web.archive.org/web/2024/velox-audit-fake",
        },
        {
          url: "https://blockbeats.com/velox-audit-analysis-fake",
          title: "BlockBeats: Velox Protocol Audit Certificate Analyzed",
        },
      ],
      personSlugs: ["luca-ferreira"],
      projectSlugs: ["velox-protocol"],
    },

    {
      slug: "moonrise-finance-misleading-promo-2023",
      type: "MISLEADING_PROMOTION",
      date: new Date("2023-04-15"),
      summary:
        "MoonRise Finance ran paid promotional campaigns through multiple influencers without disclosure, artificially inflating investor interest before the rug pull.",
      narrative:
        "Between April and July 2023, MoonRise Finance conducted an aggressive promotional campaign. Sienna Blackwood promoted the project across her YouTube channel (estimated 180K subscribers) and Twitter account, publishing at least 8 pieces of content describing MoonRise as a 'once in a cycle opportunity'. On-chain investigators later found a wallet linked to Blackwood's known addresses received 5M MOON tokens at a price of $0.0001 before public trading. The public listing price was $0.015. The promotion occurred without disclosure. A total of 4,300 retail investors entered positions based partly on the promotional campaign before the August rug pull. All information here is reported and alleged; no formal legal determinations have been made.",
      status: "APPROVED",
      sources: [
        {
          url: "https://coindesk.com/moonrise-promo-fake",
          title: "CoinDesk: MoonRise Finance Promotion Trail Leads to Undisclosed Influencer Deals",
          excerpt:
            "Before its collapse, MoonRise Finance paid multiple influencers in token allocations to promote the project without disclosure.",
          archiveUrl:
            "https://web.archive.org/web/2023/moonrise-coindesk-fake",
        },
        {
          url: "https://twitter.com/defisienna_fake/status/999888777",
          title: "Sienna Blackwood MoonRise Promotion Tweet (Archived)",
        },
      ],
      personSlugs: ["sienna-blackwood", "marco-veltri"],
      projectSlugs: ["moonrise-finance"],
    },

    {
      slug: "moonrise-finance-pump-dump-2023",
      type: "PUMP_AND_DUMP",
      date: new Date("2023-06-20"),
      summary:
        "Coordinated MOON token pump led by affiliated wallets reached 8x ATH before systematic selling reduced price by 87% within 48 hours.",
      narrative:
        "On June 18-20, 2023, MOON token experienced a coordinated price increase from $0.012 to $0.096, an 8x move. On-chain analysis showed a cluster of wallets (later linked to Marco Veltri's known addresses) systematically purchased MOON across multiple DEXes during the run-up, generating buy pressure and social media momentum. On June 20, these wallets began selling. Within 48 hours, the price collapsed to $0.012, effectively returning to pre-pump levels. The pattern is consistent with a coordinated pump-and-dump. Over 900 retail investors purchased during the pump phase. The scheme preceded the August 2023 rug pull by approximately two months, suggesting coordinated extraction. All information here is reported and alleged; no formal legal determinations have been made.",
      status: "APPROVED",
      sources: [
        {
          url: "https://nansen.ai/research/moonrise-pump-fake",
          title: "Nansen: MOON Token Pump Analysis",
          excerpt:
            "23 wallets coordinated a pump of MOON token between June 18-20. The top 5 wallet addresses account for 68% of the sell pressure during the dump phase.",
          archiveUrl:
            "https://web.archive.org/web/2023/moonrise-nansen-fake",
        },
        {
          url: "https://dexscreener.com/ethereum/moonrisefake",
          title: "DexScreener: MOON/ETH Price Chart",
        },
      ],
      personSlugs: ["marco-veltri"],
      projectSlugs: ["moonrise-finance"],
    },

    {
      slug: "dragonwave-misleading-promo-2023",
      type: "MISLEADING_PROMOTION",
      date: new Date("2023-02-01"),
      summary:
        "DragonWave NFT marketing claimed 'fully doxxed team' and 'metaverse land reserved', both of which were later found to be false.",
      narrative:
        "During the DragonWave NFT presale and public mint period (January-February 2023), the project's marketing materials prominently featured claims of a 'fully doxxed and KYC-verified founding team' and '10,000 metaverse land parcels reserved for holders'. Post-collapse investigation found that the KYC provider cited did not have a record of verifying the DragonWave team, and the metaverse land reservation was with a platform that confirmed no such agreement existed. The project's team photos were found to be AI-generated using publicly available face synthesis tools. Derek Osei was identified as the smart contract deployer through wallet forensics, though his connection to the promotional claims has not been independently verified. All information here is reported and alleged; no formal legal determinations have been made.",
      status: "APPROVED",
      sources: [
        {
          url: "https://twitter.com/nftinvestigator_fake/status/777666555",
          title: "NFT Investigator: DragonWave KYC Claims Are False",
          excerpt:
            "I reached out to the KYC provider DragonWave cited. They have no record of verifying this team. The team photos are AI-generated.",
          archiveUrl:
            "https://web.archive.org/web/2023/dragonwave-kyc-fake",
        },
        {
          url: "https://nftnow.com/dragonwave-investigation-fake",
          title: "NFTNow: DragonWave NFT — Anatomy of a Collapse",
        },
      ],
      personSlugs: ["derek-osei"],
      projectSlugs: ["dragonwave-nft"],
    },

    {
      slug: "neostream-pump-dump-2024",
      type: "PUMP_AND_DUMP",
      date: new Date("2024-02-15"),
      summary:
        "NeoStream Token experienced a secondary pump allegedly coordinated by founding team wallets 3 months after launch, resulting in 70% price collapse.",
      narrative:
        "In February 2024, approximately three months after the initial NeoStream Token launch, the token experienced a sudden price increase of approximately 400% over 5 days. On-chain investigators identified a cluster of founding team-associated wallets that purchased aggressively during the run-up. Simultaneously, a renewed social media campaign was launched claiming 'platform development milestones'. On February 15, 2024, the cluster began selling. The price fell 70% from its secondary peak within 72 hours. Investors who had held since launch — hoping for a recovery — suffered further losses. Priya Nkosi posted a thread attributing the crash to 'whale manipulation' by unnamed parties. No platform development was demonstrated during this period. All information here is reported and alleged; no formal legal determinations have been made.",
      status: "APPROVED",
      sources: [
        {
          url: "https://lookonchain.com/neostream-pump-fake",
          title: "Lookonchain: NeoStream Token Secondary Pump Analysis",
          excerpt:
            "7 wallets linked to NeoStream founding team made coordinated purchases before the Feb 2024 pump. Same wallets sold at peak, netting ~$340K.",
          archiveUrl:
            "https://web.archive.org/web/2024/neostream-lookonchain-fake",
        },
        {
          url: "https://twitter.com/yieldpriya_fake/status/444555666",
          title: "Priya Nkosi Whale Manipulation Statement",
        },
      ],
      personSlugs: ["priya-nkosi"],
      projectSlugs: ["neostream-token"],
    },
  ];

  // Create incidents and link people/projects
  for (const seed of incidentSeeds) {
    const incident = await prisma.incident.upsert({
      where: { slug: seed.slug },
      update: {},
      create: {
        slug: seed.slug,
        type: seed.type,
        date: seed.date,
        summary: seed.summary,
        narrative: seed.narrative,
        status: seed.status,
      },
    });

    // Add sources
    for (const source of seed.sources) {
      const existingSource = await prisma.source.findFirst({
        where: { incidentId: incident.id, url: source.url },
      });
      if (!existingSource) {
        await prisma.source.create({
          data: {
            incidentId: incident.id,
            url: source.url,
            title: source.title,
            excerpt: source.excerpt,
            archiveUrl: source.archiveUrl,
            addedBy: "seed",
          },
        });
      }
    }

    // Link people
    for (const personSlug of seed.personSlugs) {
      const person = await prisma.person.findUnique({
        where: { slug: personSlug },
      });
      if (person) {
        await prisma.incidentPerson
          .upsert({
            where: {
              incidentId_personId: {
                incidentId: incident.id,
                personId: person.id,
              },
            },
            update: {},
            create: { incidentId: incident.id, personId: person.id },
          })
          .catch(() => {});
      }
    }

    // Link projects
    for (const projectSlug of seed.projectSlugs) {
      const project = await prisma.project.findUnique({
        where: { slug: projectSlug },
      });
      if (project) {
        await prisma.incidentProject
          .upsert({
            where: {
              incidentId_projectId: {
                incidentId: incident.id,
                projectId: project.id,
              },
            },
            update: {},
            create: { incidentId: incident.id, projectId: project.id },
          })
          .catch(() => {});
      }
    }

    console.log(`  Incident: ${seed.slug}`);
  }

  // ─── COMPUTE RISK SCORES ───────────────────────────────────────────────────

  console.log("Computing risk scores...");

  // Compute for each person
  const allPeople = await prisma.person.findMany({
    include: {
      incidents: {
        include: {
          incident: {
            include: { sources: true },
            where: { status: "APPROVED" },
          },
        },
      },
    },
  });

  for (const person of allPeople) {
    const incidentInputs = person.incidents
      .filter((ip) => ip.incident.status === "APPROVED")
      .map((ip) => ({
        type: ip.incident.type,
        date: ip.incident.date,
        sourceCount: ip.incident.sources.length,
        hasArchivedSource: ip.incident.sources.some((s) => !!s.archiveUrl),
      }));

    if (incidentInputs.length > 0) {
      const { score, label } = computeRiskScore(incidentInputs);
      await prisma.person.update({
        where: { id: person.id },
        data: { riskScore: score, riskLabel: label },
      });
      console.log(`  ${person.name}: ${score} (${label})`);
    }
  }

  // Compute for each project
  const allProjects = await prisma.project.findMany({
    include: {
      incidents: {
        include: {
          incident: {
            include: { sources: true },
            where: { status: "APPROVED" },
          },
        },
      },
    },
  });

  for (const project of allProjects) {
    const incidentInputs = project.incidents
      .filter((ip) => ip.incident.status === "APPROVED")
      .map((ip) => ({
        type: ip.incident.type,
        date: ip.incident.date,
        sourceCount: ip.incident.sources.length,
        hasArchivedSource: ip.incident.sources.some((s) => !!s.archiveUrl),
      }));

    if (incidentInputs.length > 0) {
      const { score, label } = computeRiskScore(incidentInputs);
      await prisma.project.update({
        where: { id: project.id },
        data: { riskScore: score, riskLabel: label },
      });
      console.log(`  ${project.name}: ${score} (${label})`);
    }
  }

  // Link people to projects
  const linkPairs = [
    ["marco-veltri", "moonrise-finance"],
    ["sienna-blackwood", "moonrise-finance"],
    ["sienna-blackwood", "neostream-token"],
    ["derek-osei", "dragonwave-nft"],
    ["priya-nkosi", "neostream-token"],
    ["priya-nkosi", "solarvault-dao"],
    ["luca-ferreira", "velox-protocol"],
  ];

  for (const [personSlug, projectSlug] of linkPairs) {
    const person = await prisma.person.findUnique({ where: { slug: personSlug } });
    const project = await prisma.project.findUnique({ where: { slug: projectSlug } });
    if (person && project) {
      await prisma.personProject
        .upsert({
          where: {
            personId_projectId: {
              personId: person.id,
              projectId: project.id,
            },
          },
          update: {},
          create: { personId: person.id, projectId: project.id },
        })
        .catch(() => {});
    }
  }

  console.log("Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
