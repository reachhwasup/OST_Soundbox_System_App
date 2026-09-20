"""Branch scoping rules shared by the routers."""
from typing import Any, Dict, Optional


def effective_branch_id(current_user: Dict[str, Any], requested_branch_id: Optional[int] = None) -> Optional[int]:
    """
    Branch a request is limited to: a branch user is always limited to their own branch; a super admin
    (no branch) sees the requested branch, or all branches when none is requested.
    """
    user_branch_id = current_user.get("branch_id")
    return user_branch_id if user_branch_id is not None else requested_branch_id
