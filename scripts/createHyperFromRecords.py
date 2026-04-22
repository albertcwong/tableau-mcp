"""Accept JSON records on stdin, write a .hyper file, output base64 to stdout."""
import json
import base64
import os
import sys
import tempfile

from tableauhyperapi import (
    CreateMode,
    Connection,
    HyperProcess,
    Inserter,
    SqlType,
    TableDefinition,
    TableName,
    Telemetry,
)

TYPE_MAP = {
    "text": SqlType.text(),
    "double": SqlType.double(),
    "date": SqlType.date(),
    "bool": SqlType.bool(),
    "int": SqlType.int(),
}


def main() -> None:
    input_data = json.loads(sys.stdin.read())

    table_name = input_data.get("tableName", "Extract")
    schema_name = input_data.get("schemaName", "Extract")
    columns = input_data["columns"]
    records = input_data["records"]

    cols = []
    for c in columns:
        sql_type = TYPE_MAP[c["type"]]
        nullability = (
            TableDefinition.NULLABLE if c.get("nullable", False) else TableDefinition.NOT_NULLABLE
        )
        cols.append(TableDefinition.Column(c["name"], sql_type, nullability))

    table_def = TableDefinition(TableName(schema_name, table_name), cols)

    with tempfile.NamedTemporaryFile(suffix=".hyper", delete=False) as f:
        hyper_path = f.name

    try:
        with HyperProcess(telemetry=Telemetry.DO_NOT_SEND_USAGE_DATA_TO_TABLEAU) as hyper:
            with Connection(hyper.endpoint, hyper_path, CreateMode.CREATE_AND_REPLACE) as conn:
                conn.catalog.create_schema_if_not_exists(schema_name)
                conn.catalog.create_table(table_def)

                col_names = [c["name"] for c in columns]
                with Inserter(conn, table_def) as inserter:
                    for rec in records:
                        row = [rec.get(cn) for cn in col_names]
                        inserter.add_row(row)
                    inserter.execute()

        with open(hyper_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")

        print(b64)
    finally:
        os.unlink(hyper_path)


if __name__ == "__main__":
    main()
