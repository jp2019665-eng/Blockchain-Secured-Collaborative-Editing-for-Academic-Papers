import { describe, it, expect, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

interface Paper {
  creator: string;
  hash: Buffer;
  title: string;
  description: string;
  createdAt: number;
  cid: string;
  status: boolean;
}

interface PaperUpdate {
  updateTitle: string;
  updateDescription: string;
  updateCid: string;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class PaperRegistryMock {
  state: {
    nextPaperId: number;
    maxPapers: number;
    creationFee: number;
    authorityContract: string | null;
    papers: Map<number, Paper>;
    papersByHash: Map<string, { paperId: number }>;
    paperUpdates: Map<number, PaperUpdate>;
  } = {
    nextPaperId: 0,
    maxPapers: 10000,
    creationFee: 1000,
    authorityContract: null,
    papers: new Map(),
    papersByHash: new Map(),
    paperUpdates: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextPaperId: 0,
      maxPapers: 10000,
      creationFee: 1000,
      authorityContract: null,
      papers: new Map(),
      papersByHash: new Map(),
      paperUpdates: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setCreationFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    if (newFee < 0) return { ok: false, value: false };
    this.state.creationFee = newFee;
    return { ok: true, value: true };
  }

  setMaxPapers(newMax: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    if (newMax <= 0) return { ok: false, value: false };
    this.state.maxPapers = newMax;
    return { ok: true, value: true };
  }

  registerPaper(hash: Buffer, title: string, description: string, cid: string): Result<number> {
    if (this.state.nextPaperId >= this.state.maxPapers) return { ok: false, value: 108 };
    if (hash.length !== 32) return { ok: false, value: 102 };
    if (!title || title.length > 100) return { ok: false, value: 103 };
    if (description.length > 500) return { ok: false, value: 104 };
    if (!cid || cid.length > 100) return { ok: false, value: 110 };
    if (this.state.papersByHash.has(hash.toString("hex"))) return { ok: false, value: 101 };
    if (!this.state.authorityContract) return { ok: false, value: 109 };
    this.stxTransfers.push({ amount: this.state.creationFee, from: this.caller, to: this.state.authorityContract });
    const id = this.state.nextPaperId;
    const paper: Paper = {
      creator: this.caller,
      hash,
      title,
      description,
      createdAt: this.blockHeight,
      cid,
      status: true,
    };
    this.state.papers.set(id, paper);
    this.state.papersByHash.set(hash.toString("hex"), { paperId: id });
    this.state.nextPaperId++;
    return { ok: true, value: id };
  }

  updatePaper(id: number, newTitle: string, newDescription: string, newCid: string): Result<boolean> {
    const paper = this.state.papers.get(id);
    if (!paper) return { ok: false, value: false };
    if (paper.creator !== this.caller) return { ok: false, value: false };
    if (!newTitle || newTitle.length > 100) return { ok: false, value: false };
    if (newDescription.length > 500) return { ok: false, value: false };
    if (!newCid || newCid.length > 100) return { ok: false, value: false };
    const updated: Paper = { ...paper, title: newTitle, description: newDescription, cid: newCid, createdAt: paper.createdAt };
    this.state.papers.set(id, updated);
    this.state.paperUpdates.set(id, {
      updateTitle: newTitle,
      updateDescription: newDescription,
      updateCid: newCid,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  deactivatePaper(id: number): Result<boolean> {
    const paper = this.state.papers.get(id);
    if (!paper) return { ok: false, value: false };
    if (paper.creator !== this.caller) return { ok: false, value: false };
    if (!paper.status) return { ok: false, value: false };
    const updated: Paper = { ...paper, status: false };
    this.state.papers.set(id, updated);
    return { ok: true, value: true };
  }

  getPaper(id: number): Paper | null {
    return this.state.papers.get(id) || null;
  }

  getPaperByHash(hash: Buffer): Paper | null {
    const entry = this.state.papersByHash.get(hash.toString("hex"));
    if (!entry) return null;
    return this.state.papers.get(entry.paperId) || null;
  }

  getPaperUpdates(id: number): PaperUpdate | null {
    return this.state.paperUpdates.get(id) || null;
  }

  getPaperCount(): Result<number> {
    return { ok: true, value: this.state.nextPaperId };
  }

  isPaperRegistered(hash: Buffer): Result<boolean> {
    return { ok: true, value: this.state.papersByHash.has(hash.toString("hex")) };
  }
}

describe("PaperRegistry", () => {
  let contract: PaperRegistryMock;

  beforeEach(() => {
    contract = new PaperRegistryMock();
    contract.reset();
  });

  it("registers a paper successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = Buffer.alloc(32, 1);
    const result = contract.registerPaper(hash, "Test Paper", "A test description", "QmTestCID");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const paper = contract.getPaper(0);
    expect(paper?.title).toBe("Test Paper");
    expect(paper?.description).toBe("A test description");
    expect(paper?.cid).toBe("QmTestCID");
    expect(paper?.status).toBe(true);
    expect(paper?.creator).toBe("ST1TEST");
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate paper hash", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = Buffer.alloc(32, 1);
    contract.registerPaper(hash, "Test Paper", "A test description", "QmTestCID");
    const result = contract.registerPaper(hash, "Another Paper", "Another description", "QmAnotherCID");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(101);
  });

  it("rejects non-authorized caller for update", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = Buffer.alloc(32, 1);
    contract.registerPaper(hash, "Test Paper", "A test description", "QmTestCID");
    contract.caller = "ST3FAKE";
    const result = contract.updatePaper(0, "New Title", "New description", "QmNewCID");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects registration without authority contract", () => {
    const hash = Buffer.alloc(32, 1);
    const result = contract.registerPaper(hash, "Test Paper", "A test description", "QmTestCID");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(109);
  });

  it("updates a paper successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = Buffer.alloc(32, 1);
    contract.registerPaper(hash, "Test Paper", "A test description", "QmTestCID");
    const result = contract.updatePaper(0, "Updated Paper", "Updated description", "QmUpdatedCID");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const paper = contract.getPaper(0);
    expect(paper?.title).toBe("Updated Paper");
    expect(paper?.description).toBe("Updated description");
    expect(paper?.cid).toBe("QmUpdatedCID");
    const update = contract.getPaperUpdates(0);
    expect(update?.updateTitle).toBe("Updated Paper");
    expect(update?.updateCid).toBe("QmUpdatedCID");
  });

  it("deactivates a paper successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = Buffer.alloc(32, 1);
    contract.registerPaper(hash, "Test Paper", "A test description", "QmTestCID");
    const result = contract.deactivatePaper(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const paper = contract.getPaper(0);
    expect(paper?.status).toBe(false);
  });

  it("rejects invalid hash length", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = Buffer.alloc(31, 1);
    const result = contract.registerPaper(hash, "Test Paper", "A test description", "QmTestCID");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(102);
  });

  it("rejects invalid title length", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = Buffer.alloc(32, 1);
    const longTitle = "A".repeat(101);
    const result = contract.registerPaper(hash, longTitle, "A test description", "QmTestCID");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(103);
  });

  it("rejects invalid CID", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = Buffer.alloc(32, 1);
    const longCid = "Qm" + "A".repeat(99);
    const result = contract.registerPaper(hash, "Test Paper", "A test description", longCid);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(110);
  });

  it("sets creation fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setCreationFee(2000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.creationFee).toBe(2000);
  });

  it("returns correct paper count", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash1 = Buffer.alloc(32, 1);
    const hash2 = Buffer.alloc(32, 2);
    contract.registerPaper(hash1, "Paper 1", "Desc 1", "QmCID1");
    contract.registerPaper(hash2, "Paper 2", "Desc 2", "QmCID2");
    const result = contract.getPaperCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks paper existence by hash", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = Buffer.alloc(32, 1);
    contract.registerPaper(hash, "Test Paper", "A test description", "QmTestCID");
    const result = contract.isPaperRegistered(hash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
  });
});