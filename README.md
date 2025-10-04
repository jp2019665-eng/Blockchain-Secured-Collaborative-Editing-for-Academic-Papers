# 📝 Blockchain-Secured Collaborative Editing for Academic Papers

Welcome to a decentralized platform for collaborative academic paper editing, built on the Stacks blockchain using Clarity smart contracts. This project ensures secure, transparent, and immutable collaboration for researchers, addressing issues like document integrity, contribution tracking, and access control.

## ✨ Features

🔒 **Secure Document Registration**: Register academic papers with a unique content hash for immutable proof of existence.  
📜 **Version Control**: Track revisions with timestamps and contributor details.  
👥 **Access Control**: Manage collaborator permissions (read, write, or admin roles).  
✅ **Contribution Tracking**: Record and verify individual contributions to the paper.  
📊 **Immutable Audit Trail**: Provide a transparent history of all changes.  
🚀 **Decentralized Storage Integration**: Link with decentralized storage (e.g., IPFS) for off-chain content.  
🔍 **Verification**: Allow third parties to verify authorship and document integrity.  
🛡️ **Dispute Resolution**: Enable disputes over contributions or ownership with on-chain evidence.

## 🛠 How It Works

### For Researchers (Authors and Collaborators)
1. **Register a Paper**:  
   - Generate a SHA-256 hash of the initial paper draft.  
   - Call the `register-paper` function with the hash, title, and description.  
   - The paper is timestamped and linked to the creator’s Stacks address.  
2. **Invite Collaborators**:  
   - Use `add-collaborator` to assign roles (e.g., editor, reviewer) and permissions.  
3. **Submit Revisions**:  
   - Submit new versions with updated hashes via `submit-revision`.  
   - Each revision records the contributor, timestamp, and content hash.  
4. **Manage Access**:  
   - Admins can update permissions or remove collaborators using `update-permissions`.  
5. **Store Content**:  
   - Store the actual paper content on IPFS (or similar) and link the CID to the blockchain.  

### For Verifiers (Journals, Institutions, or Peers)
- Use `get-paper-details` to retrieve paper metadata (title, creator, timestamp).  
- Call `verify-paper` to confirm the paper’s hash and authorship.  
- Access `get-revision-history` to view the full revision trail.  

### For Dispute Resolution
- Use `initiate-dispute` to flag issues with contributions or ownership.  
- Resolve disputes via `resolve-dispute`, which references on-chain evidence.
